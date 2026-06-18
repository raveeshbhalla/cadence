import { useEffect, useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { MainApp } from "./components/MainApp";
import { api } from "./lib/api";
import { useApp } from "./store/app";

export default function App() {
  const [entered, setEntered] = useState(false);
  const [checked, setChecked] = useState(false);
  const setAccount = useApp((s) => s.setAccount);
  const hydrate = useApp((s) => s.hydrate);

  // If tokens already exist (a prior sign-in), skip straight into the app.
  useEffect(() => {
    api
      .authStatus()
      .then((acct) => {
        if (acct) {
          setAccount(acct.email);
          setEntered(true);
          hydrate();
        }
      })
      .finally(() => setChecked(true));
  }, [setAccount, hydrate]);

  if (!checked) return <div style={{ height: "100vh", background: "#0E0F13" }} />;

  return entered ? (
    <MainApp />
  ) : (
    <Onboarding
      onEnter={(email) => {
        setAccount(email);
        setEntered(true);
        hydrate();
      }}
    />
  );
}

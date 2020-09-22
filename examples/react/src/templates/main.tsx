import React, { useState } from 'react';

export default function Main(): JSX.Element {
  let [state, setState] = useState(false);
  function toggle() {
    setState((s) => !s);
  }
  return <button onClick={toggle}>{state ? 'On' : 'Off'}</button>;
}

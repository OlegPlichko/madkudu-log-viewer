import React, { useEffect, useState } from 'react';
import LogViewer from './components/LogViewer/LogViewer';
import Login from './components/Login/Login';

function App() {
  const [token, setToken] = useState<string>();
  useEffect(() => {
    setToken(localStorage.getItem('authToken'));
  }, [localStorage])
  return (
      (token ? <LogViewer token={token}/> : <Login/>)
  );
}

export default App;

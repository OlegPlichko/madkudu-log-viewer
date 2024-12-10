import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Input, 
  Button 
} from "@nextui-org/react";

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      console.log(response);

      const data = await response.json();
      console.log('data', data);

      console.log('response.ok', response.ok);
      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem('authToken', data.token);
        // Redirect to logs page
        console.log('LOGIN');
        window.location.href = '/';
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>Log Viewer Login</CardHeader>
      <CardBody>
        <form onSubmit={handleLogin}>
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-500">{error}</p>}
          <Button type="submit" color="primary">
            Login
          </Button>
        </form>
      </CardBody>
    </Card>
  );
};

export default Login;

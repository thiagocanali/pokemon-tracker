// src/App.js
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import PokemonForm from './components/PokemonForm';
import PokemonList from './components/PokemonList';
import Login from './components/Login';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
  }, [auth]);

  const handleLogout = () => {
    signOut(auth);
    setIsLoggedIn(false);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <div>
          <button onClick={handleLogout}>Logout</button>
          <h1>Gerenciamento de Pokémon</h1>
          <PokemonForm />
          <PokemonList />
        </div>
      ) : (
        <Login setIsLoggedIn={setIsLoggedIn} />
      )}
    </div>
  );
};

export default App;

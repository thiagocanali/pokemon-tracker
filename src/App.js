// src/App.js
import React from 'react';
import AddPokemonForm from './components/AddPokemonForm';
import PokemonList from './components/PokemonList';

function App() {
  return (
    <div className="App">
      <h1>Cadastro de Pokémon</h1>
      <AddPokemonForm />
      <PokemonList />
    </div>
  );
}

export default App;

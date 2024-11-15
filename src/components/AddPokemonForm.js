// src/components/AddPokemonForm.js
import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

const AddPokemonForm = () => {
  const [pokemon, setPokemon] = useState({
    name: '',
    type: '',
    cp: '',
    ivs: '',
    attack: '',
    defense: '',
    hp: '',
    notes: ''
  });

  const handleChange = (e) => {
    setPokemon({
      ...pokemon,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "pokemons"), pokemon);
      alert("Pokémon cadastrado com sucesso!");
      setPokemon({
        name: '',
        type: '',
        cp: '',
        ivs: '',
        attack: '',
        defense: '',
        hp: '',
        notes: ''
      });
    } catch (error) {
      console.error("Erro ao cadastrar Pokémon: ", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Nome" value={pokemon.name} onChange={handleChange} required />
      <input name="type" placeholder="Tipo" value={pokemon.type} onChange={handleChange} required />
      <input name="cp" placeholder="CP" value={pokemon.cp} onChange={handleChange} required />
      <input name="ivs" placeholder="IVs" value={pokemon.ivs} onChange={handleChange} required />
      <input name="attack" placeholder="Ataque" value={pokemon.attack} onChange={handleChange} />
      <input name="defense" placeholder="Defesa" value={pokemon.defense} onChange={handleChange} />
      <input name="hp" placeholder="PS" value={pokemon.hp} onChange={handleChange} />
      <textarea name="notes" placeholder="Observações" value={pokemon.notes} onChange={handleChange} />
      <button type="submit">Cadastrar Pokémon</button>
    </form>
  );
};

export default AddPokemonForm;

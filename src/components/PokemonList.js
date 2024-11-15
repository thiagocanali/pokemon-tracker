// src/components/PokemonList.js
import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const PokemonList = () => {
  const [pokemons, setPokemons] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "pokemons"));
      setPokemons(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      {pokemons.map((pokemon) => (
        <div key={pokemon.id} style={{
          border: '1px solid #ccc', padding: '16px', margin: '8px', borderRadius: '8px', width: '200px'
        }}>
          <h3>{pokemon.name}</h3>
          <p>Tipo: {pokemon.type}</p>
          <p>CP: {pokemon.cp}</p>
          <p>IVs: {pokemon.ivs}</p>
          <p>Ataque: {pokemon.attack}</p>
          <p>Defesa: {pokemon.defense}</p>
          <p>PS: {pokemon.hp}</p>
          <p>Observações: {pokemon.notes}</p>
        </div>
      ))}
    </div>
  );
};

export default PokemonList;

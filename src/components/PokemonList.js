// src/components/PokemonList.js
import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const PokemonList = () => {
  const [pokemons, setPokemons] = useState([]);
  const [filteredPokemons, setFilteredPokemons] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "pokemons"));
      const pokemonList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPokemons(pokemonList);
      setFilteredPokemons(pokemonList);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...pokemons];

    if (filterType) {
      filtered = filtered.filter(pokemon => pokemon.type.toLowerCase() === filterType.toLowerCase());
    }

    if (sortBy === 'IV') {
      filtered.sort((a, b) => b.ivs - a.ivs);
    } else if (sortBy === 'CP') {
      filtered.sort((a, b) => b.cp - a.cp);
    }

    setFilteredPokemons(filtered);
  }, [filterType, sortBy, pokemons]);

  return (
    <div>
      <div>
        <label>Filtrar por Tipo: </label>
        <input value={filterType} onChange={(e) => setFilterType(e.target.value)} placeholder="Digite o tipo..." />
        <label>Ordenar por: </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="">Selecione</option>
          <option value="IV">IV</option>
          <option value="CP">CP</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {filteredPokemons.map((pokemon) => (
          <div key={pokemon.id} style={{
            border: '1px solid #ccc', padding: '16px', margin: '8px', borderRadius: '8px', width: '200px', position: 'relative'
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
    </div>
  );
};

export default PokemonList;

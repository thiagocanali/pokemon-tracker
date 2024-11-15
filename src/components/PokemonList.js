// src/components/PokemonList.js
import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const PokemonList = () => {
  const [pokemons, setPokemons] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [editedPokemon, setEditedPokemon] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "pokemons"));
      setPokemons(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "pokemons", id));
    setPokemons(pokemons.filter(pokemon => pokemon.id !== id));
  };

  const handleEditClick = (pokemon) => {
    setIsEditing(pokemon.id);
    setEditedPokemon(pokemon);
  };

  const handleEditChange = (e) => {
    setEditedPokemon({
      ...editedPokemon,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveEdit = async (id) => {
    await updateDoc(doc(db, "pokemons", id), editedPokemon);
    setPokemons(pokemons.map(pokemon => pokemon.id === id ? editedPokemon : pokemon));
    setIsEditing(null);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      {pokemons.map((pokemon) => (
        <div key={pokemon.id} style={{
          border: '1px solid #ccc', padding: '16px', margin: '8px', borderRadius: '8px', width: '200px', position: 'relative'
        }}>
          {isEditing === pokemon.id ? (
            <div>
              <input name="name" value={editedPokemon.name} onChange={handleEditChange} />
              <input name="type" value={editedPokemon.type} onChange={handleEditChange} />
              <input name="cp" value={editedPokemon.cp} onChange={handleEditChange} />
              <input name="ivs" value={editedPokemon.ivs} onChange={handleEditChange} />
              <input name="attack" value={editedPokemon.attack} onChange={handleEditChange} />
              <input name="defense" value={editedPokemon.defense} onChange={handleEditChange} />
              <input name="hp" value={editedPokemon.hp} onChange={handleEditChange} />
              <textarea name="notes" value={editedPokemon.notes} onChange={handleEditChange} />
              <button onClick={() => handleSaveEdit(pokemon.id)}>Salvar</button>
              <button onClick={() => setIsEditing(null)}>Cancelar</button>
            </div>
          ) : (
            <div>
              <h3>{pokemon.name}</h3>
              <p>Tipo: {pokemon.type}</p>
              <p>CP: {pokemon.cp}</p>
              <p>IVs: {pokemon.ivs}</p>
              <p>Ataque: {pokemon.attack}</p>
              <p>Defesa: {pokemon.defense}</p>
              <p>PS: {pokemon.hp}</p>
              <p>Observações: {pokemon.notes}</p>
              <button onClick={() => handleEditClick(pokemon)}>Editar</button>
              <button onClick={() => handleDelete(pokemon.id)}>Excluir</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PokemonList;

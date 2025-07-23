import React, { useState } from "react";
import axios from "axios";

const AdminProductForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Пример запроса на создание продукта (URL адаптируй под свой backend)
      const response = await axios.post("/api/products", {
        name,
        description,
        price: parseFloat(price),
      });

      if (response.status === 201) {
        setMessage("Товар успешно создан!");
        setName("");
        setDescription("");
        setPrice("");
      }
    } catch (error) {
      console.error(error);
      setMessage("Ошибка при создании товара.");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Админ: Создать новый товар</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Название:</label><br />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Описание:</label><br />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Цена:</label><br />
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>
        <button type="submit">Создать товар</button>
      </form>
    </div>
  );
};

export default AdminProductForm;

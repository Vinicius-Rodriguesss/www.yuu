import express from "express";
import cors from "cors";
import Controllers from "./Controllers/index.js";
import Auth from "./Auth/Controller/index.js"

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // endereço do seu frontend
    credentials: true, // se for usar cookies/sessão futuramente
  })
);

app.use(express.json());
app.use(Controllers);

// Responsável por fazer a autenticação dos usuários
app.use(Auth)

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
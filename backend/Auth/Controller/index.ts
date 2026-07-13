import { Router } from "express";
import Authentication from "../Service/authentication.js"
import AuthenticationPage from "../Service/authenticationPage.js"
const Controllers = Router();


// Authentication
Controllers.post("/authentication", async (req, res) => {
 Authentication(req, res);
})

// Authentication Page
Controllers.post("/validate-token", async (req, res) => {
 AuthenticationPage(req, res);
})



export default Controllers;
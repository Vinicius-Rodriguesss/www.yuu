import { Router } from "express";
import {
  showAdvanceOfferPage,
  acceptAdvanceOffer,
  declineAdvanceOffer,
  showUnsubscribePage,
  confirmUnsubscribe,
} from "../Services/AdvanceOffers/respond.js";

const router = Router();

// Páginas públicas abertas pelos links do e-mail de antecipação (sem login).
// GET só mostra; POST altera — assim scanners de e-mail não respondem sozinhos.
router.get("/public/advance-offer/:token", showAdvanceOfferPage);
router.post("/public/advance-offer/:token/accept", acceptAdvanceOffer);
router.post("/public/advance-offer/:token/decline", declineAdvanceOffer);
router.get("/public/advance-offer/:token/unsubscribe", showUnsubscribePage);
router.post("/public/advance-offer/:token/unsubscribe", confirmUnsubscribe);

export default router;

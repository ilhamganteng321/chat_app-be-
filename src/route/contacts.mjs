import express from 'express';
import { middleware } from '../middleware/middleware.mjs';
import { acceptContactHandler, createContactHandler, deleteContactHandler, getChatHandler, getContactRequest } from '../controller/contacts.mjs';

const router = express.Router();

router.post('/contacts', middleware, createContactHandler);
router.post('/accep-contacts', middleware, acceptContactHandler);
router.delete('/contacts', middleware, deleteContactHandler);
router.get('/contacts', middleware, getContactRequest);
router.get('/contacts-list', middleware, getChatHandler);

export default router;
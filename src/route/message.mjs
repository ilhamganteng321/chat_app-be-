import express from 'express';
import { middleware } from '../middleware/middleware.mjs';
import { clearChatHandler, deleteMessageHandler, editMessageHandler, getMessageHandler, getMessageSenderAndReceiver, readMessageHandler, sendMessageHandler } from '../controller/message.mjs';
import { upload } from '../utils/cloudinary/upload.mjs';

const router = express.Router();

router.post('/message', middleware, upload.array('files'), sendMessageHandler)
router.get('/message', middleware, getMessageHandler);
router.get('/messages', middleware, getMessageSenderAndReceiver);
// Di file route
router.patch('/message/:messageId', middleware, editMessageHandler);
router.delete('/message/:messageId', middleware, deleteMessageHandler);
router.delete('/message/clear', middleware, clearChatHandler);
router.patch('/message', middleware, readMessageHandler);


export default router;
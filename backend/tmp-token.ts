import 'dotenv/config';
import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: 1, name: 'test', document: '00000000000', accountType: 'professional' }, process.env.JWT_SECRET || 'default_secret_key', { expiresIn: '1h' });
console.log(token);

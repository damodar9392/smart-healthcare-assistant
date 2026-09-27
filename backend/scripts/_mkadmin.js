const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = 'admin'+Date.now()+'@example.com';
  const hash = await bcrypt.hash('AdminPass123', 12);
  const user = await User.create({ name:'Admin', email, passwordHash:hash, phone:'+1111111111', role:'admin' });
  const token = jwt.sign({ id: user._id, role:'admin' }, process.env.JWT_SECRET, { expiresIn:'1h' });
  require('fs').writeFileSync('C:/Users/HOME/AppData/Local/Temp/opencode/atoken.txt', token);
  console.log('admin created', user._id);
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});

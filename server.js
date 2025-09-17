const app = require('./app');
const { PORT } = require('./config');

app.listen(PORT, () => console.log(`[SERVER] Running on port ${PORT}`));
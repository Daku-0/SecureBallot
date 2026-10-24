const path = require('path');
const { crearApp } = require('./app');

const PUERTO = Number(process.env.PORT) || 3001;
const { servidor } = crearApp({ carpetaEstatica: path.resolve(__dirname, '../frontend/dist') });

servidor.listen(PUERTO, () => {
  console.log(`SecureBallot API escuchando en http://localhost:${PUERTO}`);
  console.log('Si existe frontend/dist, tambien se sirve la interfaz en esa direccion.');
});

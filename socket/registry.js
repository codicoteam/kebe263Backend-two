// Lets REST-layer services (which have no direct access to the Socket.IO
// server instance) push live events to connected clients — e.g. a booking
// status change firing the instant it happens, instead of clients finding
// out only via polling. Namespaces register themselves here from server.js
// once created.
let ridesNamespace = null;

const setRidesNamespace = (ns) => {
  ridesNamespace = ns;
};

const getRidesNamespace = () => ridesNamespace;

module.exports = { setRidesNamespace, getRidesNamespace };

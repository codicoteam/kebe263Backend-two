const VehicleBooking = require('../models/vehicleBooking.model');
const Vehicle = require('../models/vehicle.model');

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    /**
     * Driver joins their booking room to send location updates.
     * payload: { bookingId: string }
     */
    socket.on('driver:joinBooking', ({ bookingId }) => {
      if (!bookingId) return;
      socket.join(bookingId);
      console.log(`Driver ${socket.id} joined booking room: ${bookingId}`);
    });

    /**
     * Customer joins booking room to receive live location.
     * payload: { bookingId: string }
     */
    socket.on('customer:joinBooking', ({ bookingId }) => {
      if (!bookingId) return;
      socket.join(bookingId);
      console.log(`Customer ${socket.id} joined booking room: ${bookingId}`);
    });

    /**
     * Driver emits their live location.
     * payload: { bookingId: string, lat: number, lng: number }
     * → persists to vehicle.currentLocation
     * → broadcasts customer:locationUpdate to the booking room
     */
    socket.on('driver:updateLocation', async ({ bookingId, lat, lng }) => {
      try {
        if (!bookingId || lat == null || lng == null) return;

        const booking = await VehicleBooking.findById(bookingId).select('vehicle status');
        if (!booking || booking.status !== 'inProgress') return;

        await Vehicle.findByIdAndUpdate(booking.vehicle, {
          $set: {
            'currentLocation.lat': lat,
            'currentLocation.lng': lng,
            'currentLocation.updatedAt': new Date(),
            'currentLocation.type': 'Point',
            'currentLocation.coordinates': [lng, lat],
          },
        });

        io.to(bookingId).emit('customer:locationUpdate', { lat, lng, updatedAt: new Date() });
      } catch (err) {
        console.error('driver:updateLocation error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;

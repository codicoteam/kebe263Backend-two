const VehicleBooking = require('../models/vehicleBooking.model');
const Vehicle = require('../models/vehicle.model');

// Ride-tracking namespace (mounted at /rides in server.js, behind socketAuth —
// same pattern as /chat). Every event here re-verifies that the connected,
// authenticated user is actually a party to the booking before letting them
// join its room or move the needle on it: without that check anyone who knew
// or guessed a bookingId could spy on or spoof a driver's live location.
const setupRides = (ridesNamespace) => {
  ridesNamespace.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    /**
     * Driver joins their booking room to send location updates.
     * payload: { bookingId: string }
     */
    socket.on('driver:joinBooking', async ({ bookingId } = {}) => {
      try {
        if (!bookingId) return;
        const booking = await VehicleBooking.findById(bookingId).select('owner');
        if (!booking || !booking.owner || booking.owner.toString() !== userId) {
          return socket.emit('error', { message: 'Not your booking' });
        }
        socket.join(`ride:${bookingId}`);
        socket.emit('ride:joined', { bookingId });
      } catch (err) {
        socket.emit('error', { message: 'Could not join booking' });
      }
    });

    /**
     * Customer joins booking room to receive live location.
     * payload: { bookingId: string }
     */
    socket.on('customer:joinBooking', async ({ bookingId } = {}) => {
      try {
        if (!bookingId) return;
        const booking = await VehicleBooking.findById(bookingId).select('customer');
        if (!booking || !booking.customer || booking.customer.toString() !== userId) {
          return socket.emit('error', { message: 'Not your booking' });
        }
        socket.join(`ride:${bookingId}`);
        socket.emit('ride:joined', { bookingId });
      } catch (err) {
        socket.emit('error', { message: 'Could not join booking' });
      }
    });

    /**
     * Driver emits their live location.
     * payload: { bookingId: string, lat: number, lng: number }
     * → persists to vehicle.currentLocation
     * → broadcasts customer:locationUpdate to the booking room
     */
    socket.on('driver:updateLocation', async ({ bookingId, lat, lng } = {}) => {
      try {
        if (!bookingId || lat == null || lng == null) return;

        const booking = await VehicleBooking.findById(bookingId).select('vehicle owner status');
        if (!booking || !booking.owner || booking.owner.toString() !== userId) return;
        // Location sharing starts the moment the driver accepts (customer tracks
        // them approaching pickup), not just once the ride is marked inProgress —
        // matches the mobile app's intent on both the driver and customer side.
        if (!['accepted', 'inProgress'].includes(booking.status)) return;

        await Vehicle.findByIdAndUpdate(booking.vehicle, {
          $set: {
            'currentLocation.lat': lat,
            'currentLocation.lng': lng,
            'currentLocation.updatedAt': new Date(),
            'currentLocation.type': 'Point',
            'currentLocation.coordinates': [lng, lat],
          },
        });

        ridesNamespace.to(`ride:${bookingId}`).emit('customer:locationUpdate', { lat, lng, updatedAt: new Date() });
      } catch (err) {
        console.error('driver:updateLocation error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Ride socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupRides;

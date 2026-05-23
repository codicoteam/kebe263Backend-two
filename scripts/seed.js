const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/user.model');
const ServiceProvider = require('../models/serviceProvider.model');
const Property = require('../models/property.model');
const Vehicle = require('../models/vehicle.model');
const ServiceBooking = require('../models/serviceBooking.model');
const VehicleBooking = require('../models/vehicleBooking.model');
const ServiceReview = require('../models/serviceReview.model');

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    const usersData = [
      {
        _id: mongoose.Types.ObjectId('6a0eb813d6380f6920730133'),
        firstName: 'Takunda',
        lastName: 'Gowa',
        email: 'takundagowa@gmail.com',
        phone: '+263787259729',
        password: '$2a$12$uqfFbkhWcEbUrQaFYLefVu2e4Dcj9H3QuVnM6a2QW.FO8M39o9Nui',
        roles: [],
        isAdmin: true,
        isVerified: true,
        profileImage: null,
        isActive: true,
      },
      {
        _id: mongoose.Types.ObjectId('6a0eba3ed6380f6920730139'),
        firstName: 'Takunda',
        lastName: 'Gowa',
        email: 'gowatakunda@gmail.com',
        phone: '+263787259729',
        password: '$2a$12$kmIQjNi8uZnC20dLLPxlo.M7kvgy3nq5OFvirNk5yMk2PRqybp0pW',
        roles: ['customer'],
        isAdmin: false,
        isVerified: true,
        profileImage: null,
        isActive: true,
      },
    ];

    const emails = usersData.map((user) => user.email);
    await User.deleteMany({ email: { $in: emails } });

    const createdUsers = [];
    for (const userData of usersData) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        createdUsers.push(existing);
        continue;
      }

      const hashedPassword = userData.password.startsWith('$2a$12$')
        ? userData.password
        : await bcrypt.hash(userData.password, 12);

      const created = await User.create({
        ...userData,
        password: hashedPassword,
      });
      createdUsers.push(created);
    }

    const admin = createdUsers.find((u) => u.email === 'admin@kebe263.test');
    const provider1 = createdUsers.find((u) => u.email === 'tendai.provider@kebe263.test');
    const provider2 = createdUsers.find((u) => u.email === 'anele.provider@kebe263.test');
    const customer1 = createdUsers.find((u) => u.email === 'nyasha.customer@kebe263.test');
    const customer2 = createdUsers.find((u) => u.email === 'tinashe.customer@kebe263.test');

    console.log('Created users:', createdUsers.map((u) => u.email));

    await ServiceProvider.deleteMany({ owner: { $in: [provider1._id, provider2._id] } });
    await Property.deleteMany({ owner: { $in: [provider1._id, provider2._id] } });
    await Vehicle.deleteMany({ owner: { $in: [provider1._id, provider2._id] } });

    const serviceProvidersData = [
      {
        owner: provider1._id,
        businessName: 'Tendai Home Services',
        category: 'cleaning',
        description: 'Reliable home cleaning and house maintenance across Harare.',
        estimatedPrice: 45,
        currency: 'USD',
        priceUnit: 'perJob',
        location: {
          city: 'Harare',
          address: '13 Borrowdale Road',
          lat: -17.820, 
          lng: 31.055,
        },
        isApproved: true,
        depositPaid: true,
      },
      {
        owner: provider2._id,
        businessName: 'Anele Electrical Works',
        category: 'electrical',
        description: 'Certified electrician services for homes and offices.',
        estimatedPrice: 60,
        currency: 'USD',
        priceUnit: 'perHour',
        location: {
          city: 'Bulawayo',
          address: '22 Ascot Road',
          lat: -20.150,
          lng: 28.580,
        },
        isApproved: true,
        depositPaid: true,
      },
    ];

    const createdServices = await ServiceProvider.create(serviceProvidersData);
    console.log('Created service providers:', createdServices.map((s) => s.businessName));

    const propertyData = [
      {
        owner: provider1._id,
        title: 'Cozy 2-Bedroom House in Harare',
        description: 'Well-kept rental house near shopping malls and schools.',
        type: 'residential',
        category: 'house',
        purpose: 'rent',
        price: 120,
        currency: 'USD',
        rooms: 2,
        location: {
          address: '34 Hillside View',
          city: 'Harare',
          lat: -17.789,
          lng: 31.055,
        },
        images: ['https://placehold.co/600x400?text=Property+1'],
        isApproved: true,
      },
      {
        owner: provider2._id,
        title: 'Modern Office Space in Bulawayo',
        description: 'Bright serviced office near central business district.',
        type: 'commercial',
        category: 'office',
        purpose: 'rent',
        price: 250,
        currency: 'USD',
        rooms: 4,
        location: {
          address: '9 Main Avenue',
          city: 'Bulawayo',
          lat: -20.145,
          lng: 28.588,
        },
        images: ['https://placehold.co/600x400?text=Property+2'],
        isApproved: true,
      },
    ];

    const createdProperties = await Property.create(propertyData);
    console.log('Created properties:', createdProperties.map((p) => p.title));

    const vehicleData = [
      {
        owner: provider1._id,
        make: 'Toyota',
        model: 'Fortuner',
        year: 2020,
        color: 'White',
        plateNumber: 'AB123CD',
        type: 'suv',
        pricePerKm: 0.7,
        currency: 'USD',
        images: ['https://placehold.co/600x400?text=Vehicle+1'],
        isApproved: true,
      },
      {
        owner: provider2._id,
        make: 'Nissan',
        model: 'Navara',
        year: 2018,
        color: 'Silver',
        plateNumber: 'XY987ZT',
        type: 'truck',
        pricePerKm: 0.9,
        currency: 'USD',
        images: ['https://placehold.co/600x400?text=Vehicle+2'],
        isApproved: true,
      },
    ];

    const createdVehicles = await Vehicle.create(vehicleData);
    console.log('Created vehicles:', createdVehicles.map((v) => `${v.make} ${v.model}`));

    await ServiceBooking.deleteMany({});
    await VehicleBooking.deleteMany({});
    await ServiceReview.deleteMany({});

    const serviceBookingData = [
      {
        service: createdServices[0]._id,
        customer: customer1._id,
        provider: provider1._id,
        description: 'Weekly deep-cleaning for my apartment.',
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        location: {
          address: '34 Hillside View',
          city: 'Harare',
        },
        status: 'accepted',
        agreedPrice: 50,
        currency: 'USD',
        platformFee: 5,
        providerEarnings: 45,
        paymentStatus: 'paid',
        paymentReference: 'PAY-SVC-001',
      },
      {
        service: createdServices[1]._id,
        customer: customer2._id,
        provider: provider2._id,
        description: 'Fix electrical wiring in the office.',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: {
          address: '9 Main Avenue',
          city: 'Bulawayo',
        },
        status: 'pending',
        agreedPrice: 80,
        currency: 'USD',
        platformFee: 8,
        providerEarnings: 72,
        paymentStatus: 'pending',
      },
    ];

    const createdServiceBookings = await ServiceBooking.create(serviceBookingData);
    console.log('Created service bookings:', createdServiceBookings.map((b) => b.description));

    const vehicleBookingData = [
      {
        vehicle: createdVehicles[0]._id,
        customer: customer1._id,
        owner: provider1._id,
        pickupLocation: {
          address: '34 Hillside View',
          lat: -17.789,
          lng: 31.055,
        },
        dropoffLocation: {
          address: 'Harare CBD',
          lat: -17.829,
          lng: 31.052,
        },
        status: 'completed',
        agreedPrice: 35,
        currency: 'USD',
        platformFee: 3.5,
        ownerEarnings: 31.5,
        paymentStatus: 'paid',
        paymentReference: 'PAY-VHC-001',
      },
      {
        vehicle: createdVehicles[1]._id,
        customer: customer2._id,
        owner: provider2._id,
        pickupLocation: {
          address: '9 Main Avenue',
          lat: -20.145,
          lng: 28.588,
        },
        dropoffLocation: {
          address: 'City Center',
          lat: -20.145,
          lng: 28.590,
        },
        status: 'pending',
        agreedPrice: 40,
        currency: 'USD',
        platformFee: 4,
        ownerEarnings: 36,
        paymentStatus: 'pending',
      },
    ];

    const createdVehicleBookings = await VehicleBooking.create(vehicleBookingData);
    console.log('Created vehicle bookings:', createdVehicleBookings.map((b) => `${b.status}:${b.paymentReference}`));

    await ServiceReview.create({
      booking: createdServiceBookings[0]._id,
      customer: customer1._id,
      provider: provider1._id,
      rating: 5,
      comment: 'Excellent cleaning service, very professional and punctual.',
    });

    console.log('Created service review for completed booking');
    console.log('Seed completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();

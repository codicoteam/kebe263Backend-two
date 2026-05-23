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
const Notification = require('../models/notification.model');
const PlatformConfig = require('../models/platformConfig.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    const usersData = [
      {
        _id: new mongoose.Types.ObjectId('6a0eb813d6380f6920730133'),
        firstName: 'Takunda',
        lastName: 'Gowa',
        email: 'takundagowa@gmail.com',
        phone: '+263787259729',
        password: '$2a$12$uqfFbkhWcEbUrQaFYLefVu2e4Dcj9H3QuVnM6a2QW.FO8M39o9Nui',
        roles: [],
        isAdmin: true,
        isVerified: true,
        profileImage: 'https://unsplash.com/photos/mans-grey-and-black-shirt-ILip77SbmOE',
        isActive: true,
      },
      {
        _id: new mongoose.Types.ObjectId('6a0eba3ed6380f6920730139'),
        firstName: 'Tendai',
        lastName: 'Provider',
        email: 'tendai.provider@kebe263.test',
        phone: '+263787111111',
        password: '$2a$12$kmIQjNi8uZnC20dLLPxlo.M7kvgy3nq5OFvirNk5yMk2PRqybp0pW',
        roles: ['serviceProvider'],
        isAdmin: false,
        isVerified: true,
        kycStatus: 'approved',
        kycDocuments: ['https://images.unsplash.com/photo-1581579189299-2a7d90c991f2'],
        profileImage: null,
        isActive: true,
      },
      {
        _id: new mongoose.Types.ObjectId('6a0ebc12d6380f692073014a'),
        firstName: 'Anele',
        lastName: 'Provider',
        email: 'anele.provider@kebe263.test',
        phone: '+263787222222',
        password: '$2a$12$kmIQjNi8uZnC20dLLPxlo.M7kvgy3nq5OFvirNk5yMk2PRqybp0pW',
        roles: ['serviceProvider'],
        isAdmin: false,
        isVerified: true,
        profileImage: null,
        isActive: true,
      },
      {
        _id: new mongoose.Types.ObjectId('6a11446b0f259476b1d066d5'),
        firstName: 'Willard',
        lastName: 'Kays',
        email: 'kanyembawillard4@gmail.com',
        phone: '+263713556574',
        password: '$2a$12$OIYCuKFBK2OyWJrPd4UFaOTmkXHumNNtp2DAFMaDinf3rh9N3K4Ri',
        roles: ['serviceProvider'],
        isAdmin: false,
        isVerified: true,
        kycStatus: 'pending',
        kycDocuments: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'],
        profileImage: 'https://unsplash.com/photos/man-standing-in-front-of-window-8Vt2haq8NSQ',
        isActive: true,
      },
      {
        _id: new mongoose.Types.ObjectId('6a0ebf12d6380f6920730170'),
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
      {
        _id: new mongoose.Types.ObjectId('6a0ebd2fd6380f6920730155'),
        firstName: 'Nyasha',
        lastName: 'Customer',
        email: 'nyasha.customer@kebe263.test',
        phone: '+263787333333',
        password: '$2a$12$kmIQjNi8uZnC20dLLPxlo.M7kvgy3nq5OFvirNk5yMk2PRqybp0pW',
        roles: ['customer'],
        isAdmin: false,
        isVerified: true,
        profileImage: null,
        isActive: true,
      },
      {
        _id: new mongoose.Types.ObjectId('6a0ebe4ad6380f6920730160'),
        firstName: 'Tinashe',
        lastName: 'Customer',
        email: 'tinashe.customer@kebe263.test',
        phone: '+263787444444',
        password: '$2a$12$kmIQjNi8uZnC20dLLPxlo.M7kvgy3nq5OFvirNk5yMk2PRqybp0pW',
        roles: ['customer'],
        isAdmin: false,
        isVerified: true,
        profileImage: null,
        isActive: true,
      },
    ];

    const emails = usersData.map((user) => user.email);
    const userIds = usersData.map((user) => user._id);
    await User.deleteMany({ $or: [{ email: { $in: emails } }, { _id: { $in: userIds } }] });

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

    const admin = createdUsers.find((u) => u.email === 'takundagowa@gmail.com');
    const provider1 = createdUsers.find((u) => u.email === 'tendai.provider@kebe263.test');
    const provider2 = createdUsers.find((u) => u.email === 'anele.provider@kebe263.test');
    const provider3 = createdUsers.find((u) => u.email === 'kanyembawillard4@gmail.com');
    const customer1 = createdUsers.find((u) => u.email === 'nyasha.customer@kebe263.test');
    const customer2 = createdUsers.find((u) => u.email === 'tinashe.customer@kebe263.test');

    console.log('Created users:', createdUsers.map((u) => u.email));

    const providerIds = [provider1?._id, provider2?._id, provider3?._id].filter(Boolean);
    await ServiceProvider.deleteMany({ owner: { $in: providerIds } });
    await Property.deleteMany({ owner: { $in: providerIds } });
    await Vehicle.deleteMany({ owner: { $in: providerIds } });
    await Notification.deleteMany({ recipient: { $in: userIds } });
    await PlatformConfig.deleteMany({ key: { $in: ['propertyCategories', 'vehicleTypes', 'serviceCategories'] } });
    await Wallet.deleteMany({ owner: { $in: userIds } });
    await WalletTransaction.deleteMany({ wallet: { $exists: true } });

    await PlatformConfig.insertMany([
      { key: 'propertyCategories', value: JSON.stringify(['house', 'lodge', 'apartment', 'office', 'shop']), description: 'Available property categories', updatedBy: admin._id },
      { key: 'vehicleTypes', value: JSON.stringify(['sedan', 'suv', 'truck', 'van', 'motorcycle', 'minibus']), description: 'Available vehicle types', updatedBy: admin._id },
      { key: 'serviceCategories', value: JSON.stringify(['cleaning', 'electrical', 'plumbing', 'moving', 'painting']), description: 'Available service categories', updatedBy: admin._id },
    ]);

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
          type: 'Point',
          coordinates: [31.055, -17.820],
        },
        profileImage: 'https://unsplash.com/photos/a-man-working-on-a-pipe-in-a-wall-c314Gh8dXAo',
        portfolioImages: ['https://unsplash.com/photos/a-man-working-on-a-pipe-in-a-wall-c314Gh8dXAo'],
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
          type: 'Point',
          coordinates: [28.580, -20.150],
        },
        profileImage: 'https://unsplash.com/photos/man-in-brown-hat-holding-black-and-gray-power-tool-_2AlIm-F6pw',
        portfolioImages: ['https://unsplash.com/photos/man-in-brown-hat-holding-black-and-gray-power-tool-_2AlIm-F6pw'],
        isApproved: true,
        depositPaid: true,
      },
      {
        owner: provider3?._id,
        businessName: 'Willard Plumbing Solutions',
        category: 'plumbing',
        description: 'Professional plumbing and water system services.',
        estimatedPrice: 50,
        currency: 'USD',
        priceUnit: 'perHour',
        location: {
          type: 'Point',
          coordinates: [31.060, -17.825],
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
        images: ['https://unsplash.com/photos/a-living-room-with-a-couch-and-a-fireplace-DNt5A4T0-Rs'],
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
        images: ['https://unsplash.com/photos/brown-wooden-house-on-beach-during-daytime-8SuNIFnfKZY'],
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
        images: ['https://unsplash.com/photos/red-gray-and-yellow-bus-0TmYp58QVNQ'],
        isApproved: true,
        currentLocation: {
          lat: -17.789,
          lng: 31.055,
          type: 'Point',
          coordinates: [31.055, -17.789],
        },
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
        images: ['https://unsplash.com/photos/a-red-semi-truck-driving-down-a-country-road-H2UzCyX32p4'],
        isApproved: true,
        currentLocation: {
          lat: -20.145,
          lng: 28.588,
          type: 'Point',
          coordinates: [28.588, -20.145],
        },
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

    await Wallet.create([
      { owner: customer1._id, balance: 20, currency: 'USD' },
      { owner: customer2._id, balance: 5, currency: 'USD' },
      { owner: provider1._id, balance: 50, currency: 'USD' },
    ]);

    const customer1Wallet = await Wallet.findOne({ owner: customer1._id });
    const customer2Wallet = await Wallet.findOne({ owner: customer2._id });

    await WalletTransaction.create([
      {
        wallet: customer1Wallet._id,
        type: 'deposit',
        amount: 20,
        reference: 'SEED-WALLET-001',
        description: 'Seed wallet credit',
        status: 'completed',
      },
      {
        wallet: customer2Wallet._id,
        type: 'deposit',
        amount: 5,
        reference: 'SEED-WALLET-002',
        description: 'Seed wallet credit',
        status: 'completed',
      },
    ]);

    await Notification.create([
      {
        recipient: admin._id,
        title: 'Platform seeded',
        message: 'Admin seed data has been created and platform configuration is initialized.',
        type: 'system',
      },
      {
        recipient: customer1._id,
        title: 'Service booking confirmed',
        message: 'Your weekly cleaning service has been accepted and booked successfully.',
        type: 'booking',
      },
      {
        recipient: customer1._id,
        title: 'Vehicle booking complete',
        message: 'Your vehicle rental has been completed and refunded balance is available if applicable.',
        type: 'booking',
      },
      {
        recipient: provider1._id,
        title: 'Service profile is live',
        message: 'Your service profile has been approved and is visible to customers.',
        type: 'approval',
      },
      {
        recipient: provider3._id,
        title: 'KYC pending review',
        message: 'Your verification documents are under review by admin.',
        type: 'system',
      },
    ]);

    console.log('Created service review for completed booking');
    
    // Retrieve all seeded data
    console.log('\n========== ALL SEEDED DATA ==========\n');
    
    const allUsers = await User.find().select('-password');
    console.log('\n--- ALL USERS ---');
    console.log(JSON.stringify(allUsers, null, 2));
    
    const allServiceProviders = await ServiceProvider.find();
    console.log('\n--- ALL SERVICE PROVIDERS ---');
    console.log(JSON.stringify(allServiceProviders, null, 2));
    
    const allProperties = await Property.find();
    console.log('\n--- ALL PROPERTIES ---');
    console.log(JSON.stringify(allProperties, null, 2));
    
    const allVehicles = await Vehicle.find();
    console.log('\n--- ALL VEHICLES ---');
    console.log(JSON.stringify(allVehicles, null, 2));
    
    const allServiceBookings = await ServiceBooking.find();
    console.log('\n--- ALL SERVICE BOOKINGS ---');
    console.log(JSON.stringify(allServiceBookings, null, 2));
    
    const allVehicleBookings = await VehicleBooking.find();
    console.log('\n--- ALL VEHICLE BOOKINGS ---');
    console.log(JSON.stringify(allVehicleBookings, null, 2));
    
    const allServiceReviews = await ServiceReview.find();
    console.log('\n--- ALL SERVICE REVIEWS ---');
    console.log(JSON.stringify(allServiceReviews, null, 2));
    
    console.log('\n========== SEED COMPLETED SUCCESSFULLY ==========\n');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();

// backend/routes/bookings.js
const express = require('express');
const router = express.Router();
const BookingModel = require('../models/BookingModel');
const CarModel = require('../models/CarModel');
const { authenticate, authorize } = require('../middleware/auth');

// Renter: Create booking request
router.post('/', authenticate, authorize('renter'), async (req, res) => {
    try {
        const { car_id, pickup_location, destination_location, start_date, end_date } = req.body;
        
        // Check availability
        const isAvailable = await BookingModel.checkAvailability(car_id, start_date, end_date);
        if (!isAvailable) {
            return res.status(400).json({ error: 'Car not available for selected dates' });
        }
        
        const car = await CarModel.findById(car_id);
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }
        
        const start = new Date(start_date);
        const end = new Date(end_date);
        const total_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const total_rental_price = total_days * car.price_per_day;
        const deposit_paid = car.deposit_amount;
        const total_price = total_rental_price + deposit_paid;
        
        const booking = await BookingModel.create({
            car_id,
            renter_id: req.user.userId,
            pickup_location,
            destination_location,
            start_date,
            end_date,
            total_days,
            total_rental_price,
            deposit_paid,
            extra_km_charge: 0,
            total_price
        });
        
        res.status(201).json(booking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Renter: Get my bookings
router.get('/my-bookings', authenticate, authorize('renter'), async (req, res) => {
    try {
        const bookings = await BookingModel.findRenterBookings(req.user.userId);
        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Get bookings for my cars
router.get('/owner-bookings', authenticate, authorize('owner'), async (req, res) => {
    try {
        const bookings = await BookingModel.findOwnerBookings(req.user.userId);
        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Approve booking
router.put('/:id/approve', authenticate, authorize('owner'), async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Verify the car belongs to this owner
        const car = await CarModel.findById(booking.car_id);
        if (car.owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not your car' });
        }
        
        const updatedBooking = await BookingModel.updateStatus(req.params.id, 'approved');
        res.json(updatedBooking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Reject booking
router.put('/:id/reject', authenticate, authorize('owner'), async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const car = await CarModel.findById(booking.car_id);
        if (car.owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not your car' });
        }
        
        const updatedBooking = await BookingModel.updateStatus(req.params.id, 'rejected');
        res.json(updatedBooking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Renter: Cancel booking
router.put('/:id/cancel', authenticate, authorize('renter'), async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        if (booking.renter_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not your booking' });
        }
        
        const updatedBooking = await BookingModel.updateStatus(req.params.id, 'cancelled');
        res.json(updatedBooking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Mark as completed
router.put('/:id/complete', authenticate, authorize('owner'), async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const car = await CarModel.findById(booking.car_id);
        if (car.owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not your car' });
        }
        
        const { extra_km_charge } = req.body;
        const updatedBooking = await BookingModel.updateStatus(req.params.id, 'completed', { extra_km_charge });
        res.json(updatedBooking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
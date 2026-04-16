// backend/routes/cars.js
const express = require('express');
const router = express.Router();
const CarModel = require('../models/carmodel');
const { authenticate, authorize } = require('../middleware/auth');

// Get all available cars (public)
router.get('/', async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            minPrice: req.query.minPrice,
            maxPrice: req.query.maxPrice,
            seats: req.query.seats,
            transmission: req.query.transmission
        };
        const cars = await CarModel.findAll(filters);
        res.json(cars);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single car details
router.get('/:id', async (req, res) => {
    try {
        const car = await CarModel.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }
        res.json(car);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Add new car
router.post('/', authenticate, authorize('owner'), async (req, res) => {
    try {
        const carData = { ...req.body, owner_id: req.user.userId };
        const car = await CarModel.create(carData);
        res.status(201).json(car);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Get my cars
router.get('/owner/my-cars', authenticate, authorize('owner'), async (req, res) => {
    try {
        const cars = await CarModel.findByOwner(req.user.userId);
        res.json(cars);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Update car
router.put('/:id', authenticate, authorize('owner'), async (req, res) => {
    try {
        const car = await CarModel.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }
        if (car.owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not your car' });
        }
        
        const updatedCar = await CarModel.update(req.params.id, req.body);
        res.json(updatedCar);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Owner: Delete car
router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
    try {
        const car = await CarModel.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }
        if (car.owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not your car' });
        }
        
        await CarModel.delete(req.params.id);
        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
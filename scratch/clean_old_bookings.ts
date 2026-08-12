import { connectDB } from '../src/lib/db';
import Booking from '../src/models/Booking';

async function cleanOldBookings() {
  await connectDB();
  const deleted = await Booking.deleteMany({});
  console.log(`Deleted ${deleted.deletedCount} old bookings from MongoDB!`);
  process.exit(0);
}

cleanOldBookings().catch((err) => {
  console.error(err);
  process.exit(1);
});

import mongoose from "mongoose";

const connectDb = async () => {
  const mongoUrl = process.env.MONGO_URI;

  if (!mongoUrl) {
    console.log("Mongo URL not found");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUrl, {
      /* A dropped socket should cost one retry, not a 500. Both default to
         true on Atlas, and they are written out because this is exactly the
         failure being guarded against: the connection to Atlas breaks
         mid-request and surfaces as "write EPIPE" or "read ECONNRESET".

         Deliberately not setting maxIdleTimeMS. It is the usual advice for
         this failure, but measuring it here showed nothing either way: with
         it, without it, and with no options at all, a full run of the test
         suite failed somewhere between zero and nineteen times at random.
         The drops are in the link to Atlas, not in anything configured here,
         so this adds the retries that help and avoids a setting whose only
         evidence is folklore. */
      retryWrites: true,
      retryReads: true,
      // Notice a connection problem in seconds rather than half a minute.
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 20
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDb;

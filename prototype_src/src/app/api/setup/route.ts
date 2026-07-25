import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await connectToDatabase();

    const adminEmail = "admin@gmail.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      existingAdmin.role = "admin";
      await existingAdmin.save();
      return NextResponse.json({ message: "Admin user already existed but role was updated to admin.", user: existingAdmin });
    }

    const hashedPassword = await bcrypt.hash("admin998877", 10);

    const newAdmin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });

    return NextResponse.json({
      message: "Admin user created successfully",
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create admin user", details: error.message },
      { status: 500 }
    );
  }
}

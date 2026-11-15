/**
 * Aboard seed script.
 * Run with: bun run scripts/seed.ts
 *
 * Wipes all data, then creates:
 *  - 1 admin user
 *  - 1 operator user + operator record
 *  - 2 driver users + drivers
 *  - 10 student users + students (UCC, verified)
 *  - 1 parent user + parent + accepted parent link to first student
 *  - 1 seat layout (Coaster 32: 8 rows × 4 cols, labels 1A-8D)
 *  - 4 buses (GR-4521-24 etc.)
 *  - 10 ROUTE_SEEDS as routes + stops
 *  - ~120 trips over next 5 days (3 departures/day at 6/9/13h, skip past)
 *    with 32 seats each (front 2 rows +500 pesewa)
 *
 * Demo password for all accounts: password123
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { ROUTE_SEEDS } from "../src/lib/config/ghana";

const db = new PrismaClient();

const PIVOT_DAYS = 5;
const DEPARTURE_HOURS = [6, 9, 13];

async function main() {
  console.log("🧹 Wiping database…");
  await wipeAll(db);

  console.log("👤 Creating admin user…");
  const adminUser = await db.user.create({
    data: {
      name: "Aboard Admin",
      phone: "+233200000001",
      email: "admin@aboard.gh",
      passwordHash: hashPassword("password123"),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("🏢 Creating operator…");
  const operatorUser = await db.user.create({
    data: {
      name: "Central Connect Ltd",
      phone: "+233200000002",
      email: "ops@centralconnect.gh",
      passwordHash: hashPassword("password123"),
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });
  const operator = await db.operator.create({
    data: {
      userId: operatorUser.id,
      companyName: "Central Connect Ltd",
      ghanaPostAddress: "AK-0492-8321",
      verified: true,
    },
  });

  console.log("🚌 Creating 2 drivers…");
  const driverPhones = ["+233270000001", "+233270000002"];
  const drivers = [];
  for (let i = 0; i < driverPhones.length; i++) {
    const u = await db.user.create({
      data: {
        name: i === 0 ? "Kwesi Driver" : "Yaw Steer",
        phone: driverPhones[i],
        email: `driver${i + 1}@centralconnect.gh`,
        passwordHash: hashPassword("password123"),
        role: "DRIVER",
        status: "ACTIVE",
      },
    });
    const d = await db.driver.create({
      data: {
        userId: u.id,
        operatorId: operator.id,
        licenseNumber: `GH-LIC-2024-${1000 + i}`,
        status: "ACTIVE",
        ratingAvg: 4.6 + i * 0.15,
        ratingCount: 12 + i * 5,
      },
    });
    drivers.push(d);
  }

  console.log("🎓 Creating 10 students…");
  const studentFirstNames = [
    "Ama",
    "Kofi",
    "Esi",
    "Yaw",
    "Akosua",
    "Kwabena",
    "Adwoa",
    "Kwesi",
    "Abena",
    "Kojo",
  ];
  const studentLastNames = [
    "Mensah",
    "Owusu",
    "Boateng",
    "Asante",
    "Adjei",
    "Appiah",
    "Annan",
    "Frimpong",
    "Darko",
    "Sarpong",
  ];
  const students = [];
  for (let i = 0; i < 10; i++) {
    const phone = `+2332400${String(i + 1).padStart(5, "0")}`;
    const u = await db.user.create({
      data: {
        name: `${studentFirstNames[i]} ${studentLastNames[i]}`,
        phone,
        email: `student${i + 1}@ucc.edu.gh`,
        passwordHash: hashPassword("password123"),
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    const s = await db.student.create({
      data: {
        userId: u.id,
        institution: "University of Cape Coast",
        studentIdNumber: `UCC/2024/${String(1001 + i)}`,
        verificationStatus: "VERIFIED",
        verificationMethod: "ID_CARD",
      },
    });
    students.push(s);
  }

  console.log("👪 Creating parent + link to first student…");
  const parentUser = await db.user.create({
    data: {
      name: "Mr. & Mrs. Mensah",
      phone: "+233250000001",
      email: "parent.mensah@example.com",
      passwordHash: hashPassword("password123"),
      role: "PARENT",
      status: "ACTIVE",
    },
  });
  const parent = await db.parent.create({
    data: { userId: parentUser.id },
  });
  await db.parentLink.create({
    data: {
      parentId: parent.id,
      studentId: students[0].id,
      consentStatus: "ACCEPTED",
      permissions: JSON.stringify({
        book: true,
        track: true,
        pay: true,
        notifications: true,
      }),
      acceptedAt: new Date(),
    },
  });

  console.log("💺 Creating seat layout (Coaster 32)…");
  const seatLayout = await db.seatLayout.create({
    data: {
      operatorId: operator.id,
      name: "Coaster 32",
      rows: 8,
      cols: 4,
      layout: JSON.stringify({
        type: "coaster",
        driverSide: "left",
        doorSide: "right",
        frontPremiumRows: 2,
      }),
    },
  });

  console.log("🚐 Creating 4 buses…");
  const plates = ["GR-4521-24", "GR-4522-24", "GR-4523-24", "GR-4524-24"];
  const buses = [];
  for (let i = 0; i < plates.length; i++) {
    const b = await db.bus.create({
      data: {
        operatorId: operator.id,
        plateNumber: plates[i],
        capacity: 32,
        seatLayoutId: seatLayout.id,
        status: "ACTIVE",
      },
    });
    buses.push(b);
  }

  console.log("🗺️  Creating routes + stops…");
  const routes = [];
  const routePrices = new Map<string, number>();
  for (const seed of ROUTE_SEEDS) {
    const r = await db.route.create({
      data: {
        operatorId: operator.id,
        originName: seed.originName,
        originRegion: seed.originRegion,
        destName: seed.destName,
        destRegion: seed.destRegion,
        distanceKm: seed.distanceKm,
        durationMin: seed.durationMin,
        active: true,
        stops: {
          create: seed.stops.map((s, i) => ({
            sequence: i,
            name: s.name,
            region: s.region,
            lat: s.lat,
            lng: s.lng,
            expectedOffsetMin: s.offsetMin,
            type: s.type,
          })),
        },
      },
      include: { stops: true },
    });
    routes.push(r);
    routePrices.set(r.id, seed.pricePesewa);
  }

  console.log("🗓️  Generating trips for the next 5 days…");
  const now = new Date();
  now.setSeconds(0, 0);
  let tripCount = 0;
  let seatCount = 0;
  for (let dayOffset = 0; dayOffset < PIVOT_DAYS; dayOffset++) {
    for (const route of routes) {
      for (const hour of DEPARTURE_HOURS) {
        const departure = new Date(now);
        departure.setDate(departure.getDate() + dayOffset);
        departure.setHours(hour, 0, 0, 0);
        if (departure.getTime() < Date.now()) continue;
        const arrival = new Date(departure);
        arrival.setMinutes(arrival.getMinutes() + route.durationMin);
        const bus = buses[tripCount % buses.length];
        const driver = drivers[tripCount % drivers.length];
        const basePrice = routePrices.get(route.id) ?? 5000;
        const trip = await db.trip.create({
          data: {
            routeId: route.id,
            operatorId: operator.id,
            busId: bus.id,
            driverId: driver.id,
            departureAt: departure,
            arrivalAt: arrival,
            status: "SCHEDULED",
            basePricePesewa: basePrice,
            seatsAvailable: 32,
          },
        });
        // Create 32 seats: rows 1-8, cols A-D. Front 2 rows +500 pesewa.
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 4; c++) {
            const label = `${r + 1}${String.fromCharCode(65 + c)}`;
            const price = r < 2 ? basePrice + 500 : basePrice;
            await db.seat.create({
              data: {
                tripId: trip.id,
                label,
                row: r,
                col: c,
                status: "AVAILABLE",
                pricePesewa: price,
              },
            });
            seatCount++;
          }
        }
        tripCount++;
      }
    }
  }

  console.log(
    `✅ Created ${tripCount} trips with ${seatCount} seats across ${routes.length} routes.`,
  );

  console.log("\n📋 Demo logins (password: password123):");
  console.log("  Admin     : +233200000001");
  console.log("  Operator  : +233200000002");
  console.log("  Driver 1  : +233270000001");
  console.log("  Driver 2  : +233270000002");
  console.log("  Student 1: +233240000001");
  console.log("  Student 2: +233240000002");
  console.log("  …");
  console.log("  Student 10: +233240000010");
  console.log("  Parent    : +233250000001");
  console.log("\nDone.");
}

async function wipeAll(db: PrismaClient) {
  // Order matters for foreign keys.
  const tables = [
    "Scan",
    "Ticket",
    "Refund",
    "Payment",
    "SeatLock",
    "Booking",
    "Seat",
    "LocationUpdate",
    "Trip",
    "Stop",
    "Route",
    "Bus",
    "SeatLayout",
    "ParentLink",
    "Parent",
    "Student",
    "Driver",
    "Operator",
    "Session",
    "Notification",
    "AuditLog",
    "Dispute",
    "Payout",
    "Review",
    "User",
  ];
  for (const t of tables) {
    try {
      // @ts-expect-error - dynamic table name
      await db[t].deleteMany({});
    } catch (e) {
      // ignore if table doesn't exist yet (first run)
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

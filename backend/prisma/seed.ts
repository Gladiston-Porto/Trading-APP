import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // ==================== USUÁRIOS ====================
  console.log("👤 Criando usuários...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const traderPassword = await bcrypt.hash("trader123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@tradingapp.com" },
    update: {},
    create: {
      email: "admin@tradingapp.com",
      password: adminPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  const trader = await prisma.user.upsert({
    where: { email: "trader@tradingapp.com" },
    update: {},
    create: {
      email: "trader@tradingapp.com",
      password: traderPassword,
      name: "Trader",
      role: "TRADER",
    },
  });

  console.log(`✅ Admin: ${admin.email}`);
  console.log(`✅ Trader: ${trader.email}`);

  // ==================== TICKERS ====================
  console.log("📊 Criando tickers B3 e EUA...");

  const tickers = [
    // B3 - Brasil
    { symbol: "PETR4", exchange: "B3", name: "Petróleo Brasileiro S.A.", sector: "Energia" },
    { symbol: "VALE3", exchange: "B3", name: "Vale S.A.", sector: "Mineração" },
    { symbol: "BBAS3", exchange: "B3", name: "Banco do Brasil", sector: "Financeiro" },
    { symbol: "SBSP3", exchange: "B3", name: "Sabesp", sector: "Utilidades" },
    { symbol: "WEGE3", exchange: "B3", name: "WEG", sector: "Manufatura" },
    { symbol: "ITUB4", exchange: "B3", name: "Itaú Unibanco", sector: "Financeiro" },
    { symbol: "ABEV3", exchange: "B3", name: "Ambev", sector: "Consumo" },
    // EUA
    { symbol: "AAPL", exchange: "US", name: "Apple Inc.", sector: "Tecnologia" },
    { symbol: "MSFT", exchange: "US", name: "Microsoft Corporation", sector: "Tecnologia" },
    { symbol: "GOOGL", exchange: "US", name: "Alphabet Inc.", sector: "Tecnologia" },
    { symbol: "TSLA", exchange: "US", name: "Tesla Inc.", sector: "Automotivo" },
    { symbol: "AMZN", exchange: "US", name: "Amazon.com Inc.", sector: "Varejo" },
    { symbol: "PLTR", exchange: "US", name: "Palantir Technologies", sector: "Tecnologia" },
  ];

  for (const tick of tickers) {
    await prisma.ticker.upsert({
      where: { symbol: tick.symbol },
      update: {},
      create: {
        symbol: tick.symbol,
        exchange: tick.exchange as any,
        currency: tick.exchange === "B3" ? "BRL" : "USD",
        name: tick.name,
        sector: tick.sector,
      },
    });
  }

  console.log(`✅ ${tickers.length} tickers criados`);

  // ==================== CARTEIRA ====================
  console.log("💰 Criando carteira para trader...");

  await prisma.portfolio.upsert({
    where: { userId: trader.id },
    update: {},
    create: {
      userId: trader.id,
      name: "Minha Carteira",
      baseCurrency: "BRL",
      capital: 10000, // R$ 10.000 iniciais
      riskPerTradePct: 1.0,
      dailyLossLimitPct: -3.0,
    },
  });

  console.log(`✅ Carteira criada com capital inicial: R$ 10.000`);

  // ==================== ESTRATÉGIAS ====================
  console.log("⚙️ Criando estratégias padrão...");

  const swingStrategy = await prisma.strategyConfig.upsert({
    where: { userId_name: { userId: trader.id, name: "Swing Default" } },
    update: {},
    create: {
      userId: trader.id,
      name: "Swing Default",
      type: "SWING",
      active: true,
      params: {
        emaShort: 9,
        emaMedium: 21,
        emaLong: 200,
        rsiPeriod: 14,
        rsiOversold: 30,
        macdEnabled: true,
        atrPeriod: 14,
        volumeMultiplier: 1.2,
      },
      timeframesJson: JSON.stringify(["1d"]),
    },
  });

  console.log(`✅ Estratégia "Swing Default" criada`);

  // ==================== CANDLES MOCK ====================
  console.log("📈 Criando candles de demo...");

  const petr4 = await prisma.ticker.findUnique({
    where: { symbol: "PETR4" },
  });

  if (petr4) {
    // Simular dados dos últimos 20 dias úteis
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 20);

    for (let i = 0; i < 20; i++) {
      const candleDate = new Date(baseDate);
      candleDate.setDate(candleDate.getDate() + i);

      // Skip weekends
      if (candleDate.getDay() === 0 || candleDate.getDay() === 6) continue;

      const open = 28.5 + Math.random() * 2;
      const close = open + (Math.random() - 0.5) * 2;
      const high = Math.max(open, close) + Math.random() * 0.5;
      const low = Math.min(open, close) - Math.random() * 0.5;
      const volume = 1000000 + Math.random() * 500000;

      await prisma.candle.upsert({
        where: {
          tickerId_timeframe_ts: {
            tickerId: petr4.id,
            timeframe: "D1",
            ts: new Date(candleDate.getFullYear(), candleDate.getMonth(), candleDate.getDate()),
          },
        },
        update: {},
        create: {
          tickerId: petr4.id,
          timeframe: "D1",
          ts: candleDate,
          open,
          high,
          low,
          close,
          volume,
          provider: "MOCK",
        },
      });
    }

    console.log(`✅ 20 candles mock criados para PETR4`);
  }

  // ==================== WATCHLIST ====================
  console.log("👁️ Criando watchlist...");

  const watchlist = await prisma.watchlist.create({
    data: {
      userId: trader.id,
      name: "Minha Watchlist",
    },
  });

  // Adicionar alguns tickers à watchlist
  const petr4Ticker = await prisma.ticker.findUnique({
    where: { symbol: "PETR4" },
  });
  const vale3Ticker = await prisma.ticker.findUnique({
    where: { symbol: "VALE3" },
  });

  if (petr4Ticker) {
    await prisma.watchlistItem.create({
      data: {
        watchlistId: watchlist.id,
        tickerId: petr4Ticker.id,
      },
    });
  }

  if (vale3Ticker) {
    await prisma.watchlistItem.create({
      data: {
        watchlistId: watchlist.id,
        tickerId: vale3Ticker.id,
      },
    });
  }

  console.log(`✅ Watchlist criada com 2 tickers`);

  console.log("\n✨ Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

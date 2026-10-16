/* Учебный контур. Суммы в тысячах рублей. Это не отчёт клиента. */
(function (root) {
  var ANNUAL_PLAN = {
    equip: 46800,
    service: 31200,
    license: 24600,
    project: 38900
  };

  var SEGMENTS = [
    { id: "equip", name: "Оборудование", discount: 0.07, margin: 0.24, cycle: 48, win: 0.36, coverage: 1.7, ticket: [420, 1600] },
    { id: "service", name: "Сервис", discount: 0.04, margin: 0.41, cycle: 33, win: 0.44, coverage: 1.45, ticket: [180, 640] },
    { id: "license", name: "Лицензии", discount: 0.09, margin: 0.58, cycle: 27, win: 0.31, coverage: 2.05, ticket: [140, 520] },
    { id: "project", name: "Проекты", discount: 0.06, margin: 0.29, cycle: 71, win: 0.28, coverage: 1.25, ticket: [640, 2100] }
  ];

  var SELLERS = [
    { id: "s1", name: "Соколова", weight: 0.28 },
    { id: "s2", name: "Ильин", weight: 0.22 },
    { id: "s3", name: "Белова", weight: 0.2 },
    { id: "s4", name: "Кравцов", weight: 0.18 },
    { id: "s5", name: "Орлова", weight: 0.12 }
  ];

  var STAGES = [
    { id: "interest", name: "Интерес" },
    { id: "qualified", name: "Квалифицирована" },
    { id: "proposal", name: "Предложение" },
    { id: "terms", name: "Условия" },
    { id: "won", name: "Выиграна" }
  ];

  var WIN_REASONS = ["Предмет", "Срок", "Цена", "Отношения", "Конкурс"];
  var LOSS_REASONS = ["Цена", "Нет бюджета", "Срок", "Конкурент", "Нет спонсора", "Предмет"];
  var MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  var SEASON = [0.7, 0.75, 0.9, 0.95, 1, 1.05, 0.85, 0.8, 1.05, 1.15, 1.2, 1.6];

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rand, list) {
    return list[Math.floor(rand() * list.length)];
  }

  function weightedSeller(rand) {
    var roll = rand();
    var acc = 0;
    var i;
    for (i = 0; i < SELLERS.length; i += 1) {
      acc += SELLERS[i].weight;
      if (roll <= acc) return SELLERS[i].id;
    }
    return SELLERS[SELLERS.length - 1].id;
  }

  function jitter(rand, base, spread) {
    return base * (1 + (rand() - 0.5) * spread);
  }

  function buildDeals() {
    var rand = mulberry32(202603);
    var deals = [];
    var id = 1;
    SEGMENTS.forEach(function (segment) {
      var month;
      for (month = 1; month <= 12; month += 1) {
        var monthPlan = Math.round(ANNUAL_PLAN[segment.id] * SEASON[month - 1] / 12);
        var factTarget = Math.round(monthPlan * (0.74 + rand() * 0.16));
        var wonSum = 0;
        var guard = 0;
        while (wonSum < factTarget && guard < 24) {
          var span = segment.ticket[1] - segment.ticket[0];
          var amount = Math.round(segment.ticket[0] + rand() * span);
          if (wonSum + amount > factTarget * 1.06 && wonSum > 0) {
            amount = Math.max(segment.ticket[0], factTarget - wonSum);
          }
          deals.push(makeDeal(id, segment, month, amount, "won", 4, rand));
          wonSum += amount;
          id += 1;
          guard += 1;
        }
        var lostCount = Math.max(1, Math.round((guard) * (1 - segment.win) / segment.win));
        var n;
        for (n = 0; n < lostCount; n += 1) {
          var lostAmount = Math.round(segment.ticket[0] + rand() * (segment.ticket[1] - segment.ticket[0]) * 0.7);
          var lostStage = rand() < 0.45 ? 1 : rand() < 0.75 ? 2 : 3;
          deals.push(makeDeal(id, segment, month, lostAmount, "lost", lostStage, rand));
          id += 1;
        }
        var openTarget = Math.round(Math.max(monthPlan - wonSum, monthPlan * 0.12) * segment.coverage);
        var openSum = 0;
        guard = 0;
        while (openSum < openTarget && guard < 16) {
          var openAmount = Math.round(segment.ticket[0] + rand() * (segment.ticket[1] - segment.ticket[0]));
          var share = openSum / Math.max(openTarget, 1);
          var forecast = share < 0.45 ? "commit" : share < 0.75 ? "likely" : "upside";
          var openStage = share < 0.2 ? 1 : share < 0.55 ? 2 : share < 0.82 ? 3 : 0;
          if (guard === 0) openStage = 2;
          if (rand() < 0.12 && guard > 0) openStage = 0;
          var deal = makeDeal(id, segment, month, openAmount, "open", openStage, rand);
          deal.forecast = forecast;
          deal.age = ageFor(rand, forecast);
          deal.hasNextStep = deal.age !== "stalled" && rand() > 0.18;
          deals.push(deal);
          openSum += openAmount;
          id += 1;
          guard += 1;
        }
      }
    });
    return deals;
  }

  function ageFor(rand, forecast) {
    var roll = rand();
    if (forecast === "upside") {
      if (roll < 0.42) return "stalled";
      if (roll < 0.72) return "working";
      return "fresh";
    }
    if (forecast === "commit") {
      if (roll < 0.12) return "stalled";
      if (roll < 0.4) return "working";
      return "fresh";
    }
    if (roll < 0.22) return "stalled";
    if (roll < 0.58) return "working";
    return "fresh";
  }

  function makeDeal(id, segment, month, amount, status, reached, rand) {
    var deal = {
      id: id,
      segment: segment.id,
      seller: weightedSeller(rand),
      month: month,
      week: 1 + ((id - 1) % 4),
      amount: amount,
      status: status,
      reached: reached,
      discount: Math.max(0.01, jitter(rand, segment.discount, 0.35)),
      margin: Math.max(0.08, jitter(rand, segment.margin, 0.22)),
      cycle: Math.max(12, Math.round(jitter(rand, segment.cycle, 0.4))),
      forecast: null,
      age: null,
      hasNextStep: false,
      winReason: status === "won" ? pick(rand, WIN_REASONS) : null,
      lossReason: status === "lost" ? pick(rand, LOSS_REASONS) : null
    };
    return deal;
  }

  function monthPlan(segmentId, month) {
    return Math.round(ANNUAL_PLAN[segmentId] * SEASON[month - 1] / 12);
  }

  function inPeriod(deal, period) {
    if (period === "year") return true;
    if (period === "quarter") return deal.month >= 1 && deal.month <= 3;
    return deal.month === 3;
  }

  function monthsOf(period) {
    if (period === "month") return [3];
    if (period === "quarter") return [1, 2, 3];
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  function sum(list, fn) {
    return list.reduce(function (acc, item) { return acc + fn(item); }, 0);
  }

  function groupAmount(list, keyFn) {
    var map = {};
    list.forEach(function (deal) {
      var key = keyFn(deal);
      map[key] = (map[key] || 0) + deal.amount;
    });
    return map;
  }

  function view(period, segmentId) {
    var deals = buildDeals().filter(function (deal) {
      return inPeriod(deal, period) && (segmentId === "all" || deal.segment === segmentId);
    });
    var segments = segmentId === "all" ? SEGMENTS : SEGMENTS.filter(function (item) { return item.id === segmentId; });
    var months = monthsOf(period);
    var plan = 0;
    segments.forEach(function (segment) {
      months.forEach(function (month) {
        plan += monthPlan(segment.id, month);
      });
    });
    var won = deals.filter(function (deal) { return deal.status === "won"; });
    var lost = deals.filter(function (deal) { return deal.status === "lost"; });
    var open = deals.filter(function (deal) { return deal.status === "open"; });
    var fact = sum(won, function (deal) { return deal.amount; });
    var commitOpen = sum(open.filter(function (deal) { return deal.forecast === "commit"; }), function (deal) { return deal.amount; });
    var likelyOpen = sum(open.filter(function (deal) { return deal.forecast === "likely"; }), function (deal) { return deal.amount; });
    var upsideOpen = sum(open.filter(function (deal) { return deal.forecast === "upside"; }), function (deal) { return deal.amount; });
    var lostAmount = sum(lost, function (deal) { return deal.amount; });
    var openAmount = commitOpen + likelyOpen + upsideOpen;
    var remaining = Math.max(plan - fact, 0);
    var cycleBase = sum(won, function (deal) { return deal.amount; }) || 1;
    var funnel = STAGES.map(function (stage, index) {
      var passed = deals.filter(function (deal) { return deal.reached >= index; });
      var next = index < STAGES.length - 1
        ? deals.filter(function (deal) { return deal.reached >= index + 1; })
        : [];
      var sitting = deals.filter(function (deal) {
        return deal.reached === index && deal.status !== "won";
      });
      return {
        id: stage.id,
        name: stage.name,
        count: passed.length,
        amount: sum(passed, function (deal) { return deal.amount; }),
        conv: passed.length ? next.length / passed.length : 0,
        drop: passed.length - next.length,
        sitting: sitting.length,
        sittingAmount: sum(sitting, function (deal) { return deal.amount; }),
        segments: SEGMENTS.map(function (segment) {
          return {
            name: segment.name,
            amount: sum(passed.filter(function (deal) { return deal.segment === segment.id; }), function (deal) { return deal.amount; })
          };
        }).filter(function (row) { return row.amount > 0; }),
        sellers: SELLERS.map(function (seller) {
          return {
            name: seller.name,
            amount: sum(passed.filter(function (deal) { return deal.seller === seller.id; }), function (deal) { return deal.amount; })
          };
        }).filter(function (row) { return row.amount > 0; }).sort(function (a, b) { return b.amount - a.amount; })
      };
    });
    var series = seriesFor(period, segments);
    var fresh = open.filter(function (deal) { return deal.age === "fresh"; });
    var working = open.filter(function (deal) { return deal.age === "working"; });
    var stalled = open.filter(function (deal) { return deal.age === "stalled"; });
    return {
      caption: caption(period, segmentId),
      kpis: {
        plan: plan,
        fact: fact,
        attainment: plan ? fact / plan : 0,
        commit: fact + commitOpen,
        likely: fact + commitOpen + likelyOpen,
        upside: fact + openAmount,
        coverage: remaining ? openAmount / remaining : 0,
        winRate: (fact + lostAmount) ? fact / (fact + lostAmount) : 0,
        avgCheck: won.length ? fact / won.length : 0,
        cycle: cycleBase ? sum(won, function (deal) { return deal.cycle * deal.amount; }) / cycleBase : 0,
        margin: cycleBase ? sum(won, function (deal) { return deal.margin * deal.amount; }) / cycleBase : 0
      },
      funnel: funnel,
      series: series,
      age: {
        fresh: sum(fresh, function (deal) { return deal.amount; }),
        working: sum(working, function (deal) { return deal.amount; }),
        stalled: sum(stalled, function (deal) { return deal.amount; }),
        freshCount: fresh.length,
        workingCount: working.length,
        stalledCount: stalled.length,
        open: openAmount
      },
      reasons: {
        win: rankReasons(won, "winReason"),
        loss: rankReasons(lost, "lossReason")
      },
      sellers: SELLERS.map(function (seller) {
        var owned = deals.filter(function (deal) { return deal.seller === seller.id; });
        var sellerPlan = 0;
        segments.forEach(function (segment) {
          months.forEach(function (month) {
            sellerPlan += Math.round(monthPlan(segment.id, month) * seller.weight);
          });
        });
        return {
          name: seller.name,
          plan: sellerPlan,
          fact: sum(owned.filter(function (deal) { return deal.status === "won"; }), function (deal) { return deal.amount; }),
          open: sum(owned.filter(function (deal) { return deal.status === "open"; }), function (deal) { return deal.amount; }),
          stuck: owned.filter(function (deal) { return deal.status === "open" && deal.age === "stalled"; }).length
        };
      }),
      leading: {
        meetings: open.filter(function (deal) { return deal.hasNextStep; }).length,
        proposals: open.filter(function (deal) { return deal.reached >= 2; }).length,
        stale: stalled.length
      },
      marginRows: segments.map(function (segment) {
        var rows = won.filter(function (deal) { return deal.segment === segment.id; });
        var base = sum(rows, function (deal) { return deal.amount; }) || 1;
        return {
          name: segment.name,
          discount: rows.length ? sum(rows, function (deal) { return deal.discount * deal.amount; }) / base : 0,
          margin: rows.length ? sum(rows, function (deal) { return deal.margin * deal.amount; }) / base : 0
        };
      })
    };
  }

  function seriesFor(period, segments) {
    var buckets;
    if (period === "year") {
      buckets = [
        { label: "I", months: [1, 2, 3] },
        { label: "II", months: [4, 5, 6] },
        { label: "III", months: [7, 8, 9] },
        { label: "IV", months: [10, 11, 12] }
      ];
    } else if (period === "quarter") {
      buckets = [
        { label: "янв", months: [1] },
        { label: "фев", months: [2] },
        { label: "мар", months: [3] }
      ];
    } else {
      buckets = [1, 2, 3, 4].map(function (week) {
        return { label: "Н" + week, months: [3], week: week };
      });
    }
    var deals = buildDeals().filter(function (deal) {
      return segments.some(function (segment) { return segment.id === deal.segment; });
    });
    return buckets.map(function (bucket) {
      var rows = deals.filter(function (deal) {
        var monthOk = bucket.months.indexOf(deal.month) !== -1;
        return monthOk && (!bucket.week || deal.week === bucket.week);
      });
      var fact = sum(rows.filter(function (deal) { return deal.status === "won"; }), function (deal) { return deal.amount; });
      var likelyOpen = sum(rows.filter(function (deal) {
        return deal.status === "open" && (deal.forecast === "commit" || deal.forecast === "likely");
      }), function (deal) { return deal.amount; });
      var plan = 0;
      segments.forEach(function (segment) {
        bucket.months.forEach(function (month) {
          var value = monthPlan(segment.id, month);
          plan += bucket.week ? Math.round(value / 4) : value;
        });
      });
      return { label: bucket.label, plan: plan, fact: fact, forecast: fact + likelyOpen };
    });
  }

  function rankReasons(rows, key) {
    var map = groupAmount(rows, function (deal) { return deal[key]; });
    return Object.keys(map).map(function (name) {
      return { name: name, amount: map[name] };
    }).sort(function (a, b) { return b.amount - a.amount; });
  }

  function caption(period, segmentId) {
    var periodName = period === "month" ? "Март" : period === "quarter" ? "I квартал" : "Год";
    var segmentName = "все сегменты";
    SEGMENTS.forEach(function (segment) {
      if (segment.id === segmentId) segmentName = segment.name;
    });
    return periodName + " · " + segmentName;
  }

  root.SalesBoard = {
    segments: SEGMENTS,
    stages: STAGES,
    view: view
  };
})(typeof window !== "undefined" ? window : globalThis);

const readAdminVar = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const adminTheme = {
  lime: readAdminVar("--admin-lime-main", "#a4ff00"),
  limeSoft: readAdminVar("--admin-lime-soft", "rgba(164, 255, 0, 0.1)"),
  pink: readAdminVar("--admin-pink-main", "#ff2d8f"),
  text: readAdminVar("--admin-text-sub", "#aab2b8"),
  border: readAdminVar("--admin-border", "#2a2f33"),
};

if (window.Chart) {
  Chart.defaults.color = adminTheme.text;
  Chart.defaults.borderColor = adminTheme.border;
  Chart.defaults.font.family = '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
}

const createGradient = (ctx, area, start, end) => {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, end);
  gradient.addColorStop(1, start);
  return gradient;
};

const initRevenueTrendChart = () => {
  const canvas = document.getElementById("dashboard-revenue-trend");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      datasets: [
        {
          label: "Revenue",
          data: [38, 44, 41, 57, 63, 59, 72],
          borderColor: adminTheme.lime,
          backgroundColor(context) {
            const { chart } = context;
            const { ctx, chartArea } = chart;
            if (!chartArea) return adminTheme.limeSoft;
            return createGradient(ctx, chartArea, "rgba(164,255,0,0.28)", "rgba(164,255,0,0.02)");
          },
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: "Refunds",
          data: [10, 12, 9, 14, 13, 12, 16],
          borderColor: adminTheme.pink,
          backgroundColor: "transparent",
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (value) => `$${value}k`,
          },
        },
      },
    },
  });
};

const initRevenueMixChart = () => {
  const canvas = document.getElementById("dashboard-revenue-mix");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Subscriptions", "Services", "Upsell"],
      datasets: [{
        data: [54, 28, 18],
        backgroundColor: [adminTheme.lime, "#6a8f1f", adminTheme.pink],
        borderWidth: 0,
      }],
    },
    options: {
      maintainAspectRatio: false,
      cutout: "72%",
    },
  });
};

const initTrafficChart = () => {
  const canvas = document.getElementById("analytics-traffic-trend");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Sessions",
          data: [18, 24, 21, 29, 34, 22, 19],
          backgroundColor: adminTheme.lime,
          borderRadius: 8,
        },
        {
          label: "Qualified leads",
          data: [7, 8, 9, 13, 14, 10, 8],
          backgroundColor: adminTheme.pink,
          borderRadius: 8,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (value) => `${value}k`,
          },
        },
      },
    },
  });
};

const initChannelChart = () => {
  const canvas = document.getElementById("analytics-channel-share");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "polarArea",
    data: {
      labels: ["Organic", "Paid", "Partner", "Email"],
      datasets: [{
        data: [42, 28, 18, 12],
        backgroundColor: [
          "rgba(164,255,0,0.78)",
          "rgba(164,255,0,0.46)",
          "rgba(255,45,143,0.62)",
          "rgba(255,255,255,0.18)",
        ],
        borderWidth: 0,
      }],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: {
            color: adminTheme.border,
          },
        },
      },
    },
  });
};

const initFunnelTrendChart = () => {
  const canvas = document.getElementById("analytics-funnel-trend");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: ["認知", "訪問", "資料DL", "商談化", "受注"],
      datasets: [{
        label: "転換率",
        data: [100, 64, 28, 12, 4.8],
        borderColor: adminTheme.lime,
        backgroundColor: "transparent",
        tension: 0.35,
        pointRadius: 3,
      }],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
      },
    },
  });
};

const initCostEfficiencyChart = () => {
  const canvas = document.getElementById("analytics-cost-efficiency");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["検索", "SNS", "提携", "メール"],
      datasets: [
        {
          label: "獲得単価",
          data: [2.4, 3.1, 1.8, 1.2],
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 8,
          yAxisID: "y",
        },
        {
          label: "回収日数",
          data: [18, 24, 12, 9],
          backgroundColor: adminTheme.pink,
          borderRadius: 8,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: {
          position: "left",
          ticks: {
            callback: (value) => `${value}万円`,
          },
        },
        y1: {
          position: "right",
          grid: {
            display: false,
          },
          ticks: {
            callback: (value) => `${value}日`,
          },
        },
      },
    },
  });
};

initRevenueTrendChart();
initRevenueMixChart();
initTrafficChart();
initChannelChart();
initFunnelTrendChart();
initCostEfficiencyChart();

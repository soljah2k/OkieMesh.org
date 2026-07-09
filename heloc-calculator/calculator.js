// HELOC mortgage payoff calculator
// Simulates a standard mortgage payoff against a "HELOC lump-sum paydown"
// strategy: draw HELOC funds to reduce mortgage principal immediately, pay
// the HELOC off with extra monthly cash flow, then redirect that freed-up
// cash to extra mortgage principal once the HELOC is clear.

const MAX_MONTHS = 720; // 60-year safety cap so a bad input can't infinite-loop

function monthlyRate(annualPct) {
    return annualPct / 100 / 12;
}

function monthlyPayment(balance, annualRatePct, years) {
    const r = monthlyRate(annualRatePct);
    const n = years * 12;
    if (r === 0) return balance / n;
    return (balance * r) / (1 - Math.pow(1 + r, -n));
}

function simulateBaseline(balance, annualRatePct, payment) {
    const r = monthlyRate(annualRatePct);
    let months = 0;
    let totalInterest = 0;
    const balances = [balance];
    while (balance > 0.01 && months < MAX_MONTHS) {
        const interest = balance * r;
        let principal = payment - interest;
        if (principal <= 0) {
            throw new Error("Your mortgage payment doesn't cover the monthly interest. Increase the payment or check your inputs.");
        }
        if (principal > balance) principal = balance;
        balance -= principal;
        totalInterest += interest;
        months++;
        balances.push(Math.max(balance, 0));
    }
    return { months, totalInterest, balances };
}

function simulateHelocStrategy(mortgageBalance, mortgageRatePct, payment, helocDraw, helocRatePct, extraMonthly) {
    const rM = monthlyRate(mortgageRatePct);
    const rH = monthlyRate(helocRatePct);
    const draw = Math.min(Math.max(helocDraw, 0), mortgageBalance);

    let mBal = mortgageBalance - draw;
    let hBal = draw;
    let months = 0;
    let mInterestTotal = 0;
    let hInterestTotal = 0;
    const balances = [mBal + hBal];

    while ((mBal > 0.01 || hBal > 0.01) && months < MAX_MONTHS) {
        if (mBal > 0.01) {
            const mInterest = mBal * rM;
            let mPrincipal = payment - mInterest;
            if (mPrincipal < 0) mPrincipal = 0;
            if (mPrincipal > mBal) mPrincipal = mBal;
            mBal -= mPrincipal;
            mInterestTotal += mInterest;
        }

        let leftover = 0;
        if (hBal > 0.01) {
            const hInterest = hBal * rH;
            hInterestTotal += hInterest;
            let hPrincipal = extraMonthly - hInterest;
            if (hPrincipal < 0) hPrincipal = 0;
            if (hPrincipal >= hBal) {
                leftover = hPrincipal - hBal;
                hBal = 0;
            } else {
                hBal -= hPrincipal;
            }
        } else {
            leftover = extraMonthly;
        }

        if (leftover > 0 && mBal > 0.01) {
            const extraPrincipal = Math.min(leftover, mBal);
            mBal -= extraPrincipal;
        }

        months++;
        balances.push(Math.max(mBal, 0) + Math.max(hBal, 0));
    }

    return { months, mInterestTotal, hInterestTotal, totalInterest: mInterestTotal + hInterestTotal, balances };
}

function formatCurrency(n) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatMonths(months) {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    const parts = [];
    if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
    if (rem > 0) parts.push(`${rem} month${rem === 1 ? "" : "s"}`);
    return parts.length ? parts.join(", ") : "0 months";
}

// --- Chart rendering (SVG, vanilla JS) ---

function sampleYearly(balances) {
    const points = [];
    for (let m = 0; m < balances.length; m += 12) {
        points.push({ month: m, value: balances[m] });
    }
    const last = balances.length - 1;
    if (points[points.length - 1].month !== last) {
        points.push({ month: last, value: balances[last] });
    }
    return points;
}

function renderChart(baselineBalances, strategyBalances) {
    const svg = document.getElementById("chart");
    svg.innerHTML = "";

    const width = 800;
    const height = 420;
    const margin = { top: 20, right: 20, bottom: 40, left: 70 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    const maxMonth = Math.max(baselineBalances.length, strategyBalances.length) - 1;
    const maxValue = Math.max(...baselineBalances, ...strategyBalances);

    const x = (month) => margin.left + (month / maxMonth) * plotW;
    const y = (value) => margin.top + plotH - (value / maxValue) * plotH;

    const ns = "http://www.w3.org/2000/svg";
    function el(tag, attrs) {
        const node = document.createElementNS(ns, tag);
        for (const k in attrs) node.setAttribute(k, attrs[k]);
        return node;
    }

    // Gridlines + y-axis labels (5 bands)
    const bands = 5;
    for (let i = 0; i <= bands; i++) {
        const value = (maxValue / bands) * i;
        const yy = y(value);
        svg.appendChild(el("line", { x1: margin.left, x2: width - margin.right, y1: yy, y2: yy, class: "chart-gridline" }));
        const label = el("text", { x: margin.left - 10, y: yy + 4, class: "chart-axis-label", "text-anchor": "end" });
        label.textContent = "$" + Math.round(value / 1000) + "k";
        svg.appendChild(label);
    }

    // X-axis (years)
    const totalYears = Math.round(maxMonth / 12);
    const yearStep = totalYears > 20 ? 5 : totalYears > 10 ? 2 : 1;
    for (let yr = 0; yr <= totalYears; yr += yearStep) {
        const xx = x(yr * 12);
        const label = el("text", { x: xx, y: height - margin.bottom + 20, class: "chart-axis-label", "text-anchor": "middle" });
        label.textContent = "Yr " + yr;
        svg.appendChild(label);
    }
    svg.appendChild(el("line", { x1: margin.left, x2: width - margin.right, y1: height - margin.bottom, y2: height - margin.bottom, class: "chart-axis" }));

    function pathFor(balances) {
        return balances.map((v, m) => `${m === 0 ? "M" : "L"}${x(m)},${y(v)}`).join(" ");
    }

    svg.appendChild(el("path", { d: pathFor(baselineBalances), class: "chart-line-baseline" }));
    svg.appendChild(el("path", { d: pathFor(strategyBalances), class: "chart-line-strategy" }));

    // Hover layer: crosshair + tooltip
    const hoverRect = el("rect", { x: margin.left, y: margin.top, width: plotW, height: plotH, class: "chart-hover-rect" });
    const crosshair = el("line", { class: "chart-crosshair", y1: margin.top, y2: height - margin.bottom, x1: -100, x2: -100 });
    const dotBaseline = el("circle", { r: 4, class: "chart-dot-baseline", cx: -100, cy: -100 });
    const dotStrategy = el("circle", { r: 4, class: "chart-dot-strategy", cx: -100, cy: -100 });
    svg.appendChild(crosshair);
    svg.appendChild(dotBaseline);
    svg.appendChild(dotStrategy);
    svg.appendChild(hoverRect);

    const tooltip = document.getElementById("chart-tooltip");
    const wrapper = document.getElementById("chart-wrapper");

    function onMove(evt) {
        const rect = svg.getBoundingClientRect();
        const scale = width / rect.width;
        const px = (evt.clientX - rect.left) * scale;
        let month = Math.round(((px - margin.left) / plotW) * maxMonth);
        month = Math.max(0, Math.min(maxMonth, month));

        const bVal = baselineBalances[Math.min(month, baselineBalances.length - 1)];
        const sVal = strategyBalances[Math.min(month, strategyBalances.length - 1)];
        const xx = x(month);

        crosshair.setAttribute("x1", xx);
        crosshair.setAttribute("x2", xx);
        dotBaseline.setAttribute("cx", xx);
        dotBaseline.setAttribute("cy", y(bVal));
        dotStrategy.setAttribute("cx", xx);
        dotStrategy.setAttribute("cy", y(sVal));

        tooltip.hidden = false;
        tooltip.innerHTML = `<strong>Year ${(month / 12).toFixed(1)}</strong><br>` +
            `<span class="tt-baseline">Baseline: ${formatCurrency(bVal)}</span><br>` +
            `<span class="tt-strategy">HELOC strategy: ${formatCurrency(sVal)}</span>`;

        const wrapperRect = wrapper.getBoundingClientRect();
        const svgLeft = rect.left - wrapperRect.left;
        const svgTop = rect.top - wrapperRect.top;
        tooltip.style.left = Math.min(svgLeft + (xx / width) * rect.width + 12, wrapperRect.width - 180) + "px";
        tooltip.style.top = svgTop + 10 + "px";
    }

    function onLeave() {
        tooltip.hidden = true;
        crosshair.setAttribute("x1", -100);
        crosshair.setAttribute("x2", -100);
        dotBaseline.setAttribute("cx", -100);
        dotStrategy.setAttribute("cx", -100);
    }

    hoverRect.addEventListener("mousemove", onMove);
    hoverRect.addEventListener("mouseleave", onLeave);
    hoverRect.addEventListener("touchmove", (e) => onMove(e.touches[0]));
    hoverRect.addEventListener("touchend", onLeave);
}

function renderTable(baselineBalances, strategyBalances) {
    const tbody = document.querySelector("#balance-table tbody");
    tbody.innerHTML = "";
    const baselinePoints = sampleYearly(baselineBalances);
    const strategyPoints = sampleYearly(strategyBalances);
    const rows = Math.max(baselinePoints.length, strategyPoints.length);
    for (let i = 0; i < rows; i++) {
        const year = Math.round((baselinePoints[i] || strategyPoints[i]).month / 12);
        const bVal = baselinePoints[i] ? baselinePoints[i].value : 0;
        const sVal = strategyPoints[i] ? strategyPoints[i].value : 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${year}</td><td>${formatCurrency(bVal)}</td><td>${formatCurrency(sVal)}</td>`;
        tbody.appendChild(tr);
    }
}

document.getElementById("heloc-form").addEventListener("submit", function (evt) {
    evt.preventDefault();
    const errorEl = document.getElementById("calc-error");
    errorEl.hidden = true;

    const mortgageBalance = parseFloat(document.getElementById("mortgage-balance").value);
    const mortgageRate = parseFloat(document.getElementById("mortgage-rate").value);
    const mortgageYears = parseFloat(document.getElementById("mortgage-years").value);
    const helocLimit = parseFloat(document.getElementById("heloc-limit").value);
    const helocRate = parseFloat(document.getElementById("heloc-rate").value);
    const helocDraw = parseFloat(document.getElementById("heloc-draw").value);
    const extraMonthly = parseFloat(document.getElementById("extra-monthly").value);

    if (helocDraw > helocLimit) {
        errorEl.textContent = "The HELOC draw amount can't exceed your HELOC credit limit.";
        errorEl.hidden = false;
        return;
    }

    try {
        const payment = monthlyPayment(mortgageBalance, mortgageRate, mortgageYears);
        const baseline = simulateBaseline(mortgageBalance, mortgageRate, payment);
        const strategy = simulateHelocStrategy(mortgageBalance, mortgageRate, payment, helocDraw, helocRate, extraMonthly);

        document.getElementById("baseline-time").textContent = formatMonths(baseline.months);
        document.getElementById("baseline-interest").textContent = formatCurrency(baseline.totalInterest);
        document.getElementById("strategy-time").textContent = formatMonths(strategy.months);
        document.getElementById("strategy-interest").textContent = formatCurrency(strategy.totalInterest);

        const monthsSaved = baseline.months - strategy.months;
        const interestSaved = baseline.totalInterest - strategy.totalInterest;
        document.getElementById("time-saved").textContent = (monthsSaved >= 0 ? "" : "+") + formatMonths(Math.abs(monthsSaved)) + (monthsSaved >= 0 ? " sooner" : " longer");
        document.getElementById("interest-saved").textContent = (interestSaved >= 0 ? "" : "-") + formatCurrency(Math.abs(interestSaved));

        renderChart(baseline.balances, strategy.balances);
        renderTable(baseline.balances, strategy.balances);

        document.getElementById("results").hidden = false;
        document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
    }
});

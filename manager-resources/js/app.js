// O'Reilly Creative Studio: portable calendar display-time conversion.
(() => {
  const formatSchedule = (start, end, timeZone) => {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return null;
    const date = new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone,
    }).format(startDate);
    const clock = (value) => new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone,
    }).format(value).replace(":00", "").replace(" ", "").toLowerCase();
    const zone = timeZone === "UTC" ? "UTC" : timeZone === "Asia/Kolkata" ? "IST" : new Intl.DateTimeFormat("en-US", {
      timeZone, timeZoneName: "short",
    }).formatToParts(startDate).find((part) => part.type === "timeZoneName")?.value || timeZone;
    const endDate = end ? new Date(end) : null;
    return `${date} · ${clock(startDate)}${endDate && !Number.isNaN(endDate.getTime()) ? `–${clock(endDate)}` : ""} ${zone}`;
  };
  const sourceZones = {
    ET: "America/New_York", EST: "America/New_York", EDT: "America/New_York",
    CT: "America/Chicago", CST: "America/Chicago", CDT: "America/Chicago",
    MT: "America/Denver", MST: "America/Denver", MDT: "America/Denver",
    PT: "America/Los_Angeles", PST: "America/Los_Angeles", PDT: "America/Los_Angeles",
    UTC: "UTC", GMT: "UTC", BST: "Europe/London", IST: "Asia/Kolkata",
  };
  const monthIndex = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  };
  const dateParts = (value) => {
    const match = (value || "").match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s+(\d{4})\b/i);
    if (!match) return null;
    const month = monthIndex[match[1].replace(".", "").slice(0, 4).toLowerCase()] ?? monthIndex[match[1].replace(".", "").slice(0, 3).toLowerCase()];
    return month === undefined ? null : { year: Number(match[3]), month, day: Number(match[2]) };
  };
  const parseClock = (value) => {
    const normalized = value.trim().replace(/\s/g, "").toLowerCase();
    if (normalized === "noon") return { hour: 12, minute: 0 };
    if (normalized === "midnight") return { hour: 0, minute: 0 };
    const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/.exec(normalized);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    return hour < 1 || hour > 12 || minute > 59 ? null : { hour: hour % 12 + (match[3] === "pm" ? 12 : 0), minute };
  };
  const zoneOffsetAt = (instant, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(instant));
    const part = (type) => Number(parts.find((value) => value.type === type)?.value);
    return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second")) - instant;
  };
  const wallClockInstant = (date, clock, timeZone) => {
    const localAsUtc = Date.UTC(date.year, date.month, date.day, clock.hour, clock.minute);
    let instant = localAsUtc - zoneOffsetAt(localAsUtc, timeZone);
    instant = localAsUtc - zoneOffsetAt(instant, timeZone);
    return new Date(instant).toISOString();
  };
  const formatEditorialSchedule = (date, time, timeZone) => {
    const match = (time || "").match(/^\s*(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–-]\s*(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+(ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT|UTC|GMT|BST|IST)\b(.*)$/i);
    const sourceDate = dateParts(date);
    const startClock = match && parseClock(match[1]);
    const endClock = match && parseClock(match[2]);
    const sourceTimeZone = match && sourceZones[match[3].toUpperCase()];
    if (!sourceDate || !startClock || !endClock || !sourceTimeZone) return null;
    const formatted = formatSchedule(
      wallClockInstant(sourceDate, startClock, sourceTimeZone),
      wallClockInstant(sourceDate, endClock, sourceTimeZone),
      timeZone,
    );
    return formatted && match[4].trim() ? `${formatted} ${match[4].trim()}` : formatted;
  };
  const resolveTimeZone = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const render = (root, timeZone) => {
    root?.querySelectorAll("[data-curated-calendar-card], [data-curated-learning-card], [data-live-event-schedule-source], [data-live-event-start]").forEach((card) => {
      const start = card.dataset.curatedCalendarStart || card.dataset.liveEventStart;
      const end = card.dataset.curatedCalendarEnd || card.dataset.liveEventEnd;
      const schedule = formatSchedule(start, end, timeZone) ||
        formatEditorialSchedule(card.dataset.liveEventDate, card.dataset.liveEventTime, timeZone);
      if (!schedule) return;
      const date = schedule.split(" · ")[0];
      const time = schedule.slice(date.length + 3);
      const dateTarget = card.querySelector("[data-live-event-schedule-date]");
      const timeTarget = card.querySelector("[data-live-event-schedule-time]");
      const target = card.querySelector("[data-curated-calendar-schedule], [data-live-event-schedule]");
      if (dateTarget && timeTarget) {
        dateTarget.textContent = date;
        timeTarget.textContent = time;
      } else if (target) {
        target.textContent = schedule;
      }
    });
  };
  const initialize = () => document.querySelectorAll("[data-curated-learning-calendar], [data-curated-learning-page]").forEach((root) => {
    render(root, resolveTimeZone());
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();

// O'Reilly Creative Studio: keep computed "Next up" modules current after a
// static export. The reservoir already contains every page resource, so this
// deliberately performs no network request and uses the viewer's clock.
(() => {
  const monthIndex = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const eventStart = (card) => {
    const iso = card.dataset.liveEventStart;
    if (iso) {
      const instant = Date.parse(iso);
      if (!Number.isNaN(instant)) return instant;
    }
    // Editorial-only schedules have no ISO instant. Treat their confirmed first
    // calendar date as UTC midnight, consistently for every viewer.
    const match = (card.dataset.liveEventDate || "").match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s+(\d{4})\b/i);
    if (!match) return null;
    const key = match[1].replace(".", "").slice(0, 3).toLowerCase();
    const month = monthIndex[key];
    return month === undefined ? null : Date.UTC(Number(match[3]), month, Number(match[2]));
  };
  const scheduleText = (card) => {
    const date = card.querySelector("[data-live-event-schedule-date]")?.textContent?.trim();
    const time = card.querySelector("[data-live-event-schedule-time]")?.textContent?.trim();
    if (date && time) return `${date} · ${time}`;
    return card.querySelector("[data-live-event-schedule]")?.textContent?.trim() || "";
  };
  const scheduleParts = (card) => {
    const date =
      card.querySelector("[data-live-event-schedule-date]")?.textContent?.trim() ||
      card.dataset.liveEventDate ||
      "";
    const time =
      card.querySelector("[data-live-event-schedule-time]")?.textContent?.trim() ||
      card.dataset.liveEventTime ||
      "";
    if (date && time) return { date, time };
    const combined = scheduleText(card);
    const split = combined.split(" · ");
    return split.length >= 2
      ? { date: split[0].trim(), time: split.slice(1).join(" · ").trim() }
      : null;
  };
  const renderNextUp = (root) => {
    const now = Date.now();
    const candidates = Array.from(
      root.querySelectorAll("[data-curated-learning-card][data-live-event-schedule-source]"),
    )
      .map((card) => ({ card, start: eventStart(card) }))
      .filter((candidate) => candidate.start !== null && candidate.start >= now)
      .sort((left, right) => left.start - right.start);
    root.querySelectorAll("[data-curated-learning-next-up='true']").forEach((module) => {
      const selected = candidates[0]?.card;
      module.hidden = !selected;
      if (!selected) return;
      const title = selected.dataset.liveEventTitle || "";
      const titleTarget = module.querySelector("[data-curated-learning-next-up-title]");
      const titleLink = titleTarget?.querySelector("a");
      if (titleLink && title) {
        titleLink.textContent = title;
        if (selected.dataset.liveEventUrl) titleLink.href = selected.dataset.liveEventUrl;
      } else if (titleTarget && title) {
        titleTarget.textContent = title;
      }
      const scheduleTarget = module.querySelector("[data-live-event-schedule]");
      if (!scheduleTarget) return;
      const dateTarget = scheduleTarget.querySelector("[data-live-event-schedule-date]");
      const timeTarget = scheduleTarget.querySelector("[data-live-event-schedule-time]");
      const parts = scheduleParts(selected);
      if (dateTarget && timeTarget && parts) {
        dateTarget.textContent = parts.date;
        timeTarget.textContent = parts.time;
      } else {
        const schedule = scheduleText(selected);
        if (schedule) scheduleTarget.textContent = schedule;
      }
    });
  };
  const initialize = () => document.querySelectorAll("[data-curated-learning-page]").forEach(renderNextUp);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();

// O'Reilly Creative Studio: portable curated-learning filters.
(() => {
  const normalize = (value) => (value || "").trim().toLowerCase();
  const topicsFor = (card) => {
    try {
      return JSON.parse(card.dataset.curatedLearningCardTopics || "[]").map(normalize);
    } catch {
      return [];
    }
  };
  const cloneCard = (card) => card.cloneNode(true);
  const liveType = (card) => {
    const type = card.dataset.curatedLearningCardType || "";
    return type === "Live event" || type === "Live Courses" || type === "Special event";
  };
  const pastBoundary = (card) => {
    if (!liveType(card)) return null;
    const end = Date.parse(card.dataset.liveEventEnd || "");
    if (!Number.isNaN(end)) return end;
    const start = Date.parse(card.dataset.liveEventStart || "");
    if (!Number.isNaN(start)) return start + 24 * 60 * 60 * 1000;
    const match = (card.dataset.liveEventDate || "").match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:\s*[–—-]\s*(\d{1,2}))?,?\s+(\d{4})\b/i);
    if (!match) return null;
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const month = months[match[1].slice(0, 3).toLowerCase()];
    return month === undefined ? null : Date.UTC(Number(match[4]), month, Number(match[3] || match[2]) + 1);
  };
  const isPastEvent = (card, now = Date.now()) => {
    const boundary = pastBoundary(card);
    return boundary !== null && boundary <= now;
  };
  const cloneForSection = (card, past) => {
    const clone = cloneCard(card);
    if (past) clone.dataset.curatedLearningCardPast = "true";
    else delete clone.dataset.curatedLearningCardPast;
    const badge = clone.querySelector("[data-curated-learning-card-badge='true']");
    if (badge && liveType(clone)) {
      badge.textContent = past ? "Past Event" : clone.dataset.curatedLearningCardType || "Live event";
    }
    const cta = clone.querySelector("[data-curated-learning-card-cta][data-curated-learning-card-default-cta='true']");
    if (cta) cta.textContent = past ? "View recording" : "View details";
    return clone;
  };
  const render = (root) => {
    const reservoir = root.querySelector("[data-curated-learning-card-reservoir]");
    const target = root.querySelector("[data-curated-learning-resource-sections]");
    const blueprint = target && target.querySelector("section[data-curated-learning-section]");
    if (!reservoir || !target || !blueprint) return;

    const controls = {};
    root.querySelectorAll("select[data-curated-learning-filter]").forEach((select) => {
      controls[select.dataset.curatedLearningFilter] = select.value;
    });
    const cards = Array.from(reservoir.querySelectorAll("[data-curated-learning-card]"));
    const topic = controls.topic || "All topics";
    const format = controls.format || "All formats";
    const level = controls.level || "All levels";
    const sort = controls.sort || "Upcoming first";
    const visible = cards.filter((card) => {
      const cardTopic = normalize(card.dataset.curatedLearningCardCategory);
      const matchesTopic = topic === "All topics" ||
        cardTopic === normalize(topic) || topicsFor(card).includes(normalize(topic));
      const type = card.dataset.curatedLearningCardType || "";
      const matchesFormat = format === "All formats" ||
        (format === "Live" && (type === "Live event" || type === "Live Courses")) ||
        (format === "Special event" && type === "Special event") ||
        type === format;
      const matchesLevel = level === "All levels" ||
        normalize(card.dataset.curatedLearningCardLevel) === normalize(level);
      return matchesTopic && matchesFormat && matchesLevel;
    });
    const compare = (left, right) => {
      if (sort === "Recently added") {
        return (right.dataset.curatedLearningCard || "").localeCompare(left.dataset.curatedLearningCard || "");
      }
      if (sort === "Topic") {
        return (left.dataset.curatedLearningCardTitle || "").localeCompare(right.dataset.curatedLearningCardTitle || "");
      }
      return (left.dataset.curatedLearningCardDate || "").localeCompare(right.dataset.curatedLearningCardDate || "");
    };
    const now = Date.now();
    const past = visible.filter((card) => isPastEvent(card, now));
    const current = visible.filter((card) => !isPastEvent(card, now));
    const groups = new Map();
    current.forEach((card) => {
      const title = sort === "Topic"
        ? card.dataset.curatedLearningCardCategory || "Other topics"
        : card.dataset.curatedLearningCardSection || "Learning";
      const items = groups.get(title) || [];
      items.push(card);
      groups.set(title, items);
    });
    if (past.length) {
      const items = groups.get("Past Events") || [];
      items.push(...past);
      groups.set("Past Events", items);
    }
    const topicOrder = JSON.parse(root.dataset.curatedLearningTopicOrder || "[]").map(normalize);
    const orderedGroups = Array.from(groups.entries()).sort(([left], [right]) => {
      if (left === "Past Events") return 1;
      if (right === "Past Events") return -1;
      if (sort !== "Topic") return 0;
      const leftIndex = topicOrder.indexOf(normalize(left));
      const rightIndex = topicOrder.indexOf(normalize(right));
      return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex) ||
        left.localeCompare(right);
    });

    // Keep authored modules in the document while rebuilding only resource
    // sections. Their Studio placement is intentionally not inferred here.
    const modules = Array.from(target.querySelectorAll("[data-curated-learning-page-module]"));
    target.replaceChildren();
    orderedGroups.forEach(([title, group], index) => {
      const section = blueprint.cloneNode(true);
      section.dataset.curatedLearningSection = normalize(title).replace(/\W+/g, "-");
      const heading = section.querySelector("h2");
      if (heading) heading.textContent = title;
      const count = Array.from(section.querySelectorAll("p")).find((node) => /\d+ resources/.test(node.textContent || ""));
      if (count) count.textContent = `${group.length} resources`;
      const grid = section.querySelector("[data-curated-learning-page-grid]");
      if (!grid) return;
      const pastSection = title === "Past Events";
      const sorted = group.sort(
        pastSection
          ? (left, right) =>
              (pastBoundary(right) || 0) - (pastBoundary(left) || 0) || compare(left, right)
          : compare,
      );
      grid.replaceChildren(...sorted.map((card) => cloneForSection(card, pastSection)));
      const wrapper = document.createElement("div");
      wrapper.append(section);
      target.append(wrapper);
    });
    if (!orderedGroups.length) {
      const section = blueprint.cloneNode(true);
      const grid = section.querySelector("[data-curated-learning-page-grid]");
      if (grid) grid.replaceChildren();
      const content = section.querySelector("[data-curated-learning-page-content]");
      if (content) {
        const empty = document.createElement("p");
        empty.className = "mt-6 max-w-2xl text-[#4A5763]";
        empty.textContent = "No learning matches these filters yet. Try another topic or format.";
        content.append(empty);
      }
      const wrapper = document.createElement("div");
      wrapper.append(section);
      target.append(wrapper);
    }
    modules.forEach((module) => target.append(module));
    const nextBoundary = cards
      .map(pastBoundary)
      .filter((boundary) => boundary !== null && boundary > now)
      .sort((left, right) => left - right)[0];
    if (root.__curatedPastEventsTimer) clearTimeout(root.__curatedPastEventsTimer);
    if (nextBoundary !== undefined) {
      const delay = Math.min(Math.max(nextBoundary - now + 250, 1000), 2147483647);
      root.__curatedPastEventsTimer = setTimeout(() => render(root), delay);
    }
  };
  const initialize = () => document.querySelectorAll("[data-curated-learning-page]").forEach((root) => {
    root.querySelectorAll("select[data-curated-learning-filter]").forEach((select) => {
      select.addEventListener("change", () => render(root));
    });
    render(root);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();

// O'Reilly Creative Studio: portable curated-calendar filters and collapse.
(() => {
  const normalize = (value) => (value || "").trim().toLowerCase();
  const cloneCard = (card) => card.cloneNode(true);
  const matchesSkill = (card, skill) => {
    if (!skill || skill === "all") return true;
    const needle = normalize(skill);
    try {
      if (JSON.parse(card.dataset.curatedCalendarTopics || "[]").map(normalize).includes(needle)) return true;
    } catch {}
    return normalize(card.dataset.curatedCalendarSearch).includes(needle);
  };
  const matchesFormat = (card, format) => {
    const type = card.dataset.curatedCalendarContentType || "";
    if (!format || format === "all" || format === "live") return type !== "course";
    return type === format;
  };
  const matchesLevel = (card, level) =>
    !level || level === "all" || normalize(card.dataset.curatedCalendarLevel) === normalize(level);
  const matchesMonth = (card, month) =>
    !month || month === "all" || (card.dataset.curatedCalendarMonth || "") === month;
  const byStart = (left, right) =>
    (left.dataset.curatedCalendarStart || "").localeCompare(right.dataset.curatedCalendarStart || "") ||
    (left.dataset.curatedCalendarTitle || "").localeCompare(right.dataset.curatedCalendarTitle || "");
  const setExpanded = (section, expanded) => {
    if (!section) return;
    const expandedNode = section.querySelector("[data-curated-calendar-expanded]");
    const collapsedNode = section.querySelector("[data-curated-calendar-collapsed]");
    if (expandedNode) expandedNode.hidden = !expanded;
    if (collapsedNode) collapsedNode.hidden = expanded;
    const nextClass = expanded
      ? section.dataset.curatedCalendarExpandedClass
      : section.dataset.curatedCalendarCollapsedClass;
    if (nextClass) section.className = nextClass;
  };
  const fillGrid = (section, cards) => {
    if (!section) return;
    const grid = section.querySelector("[data-curated-calendar-grid]");
    if (grid) grid.replaceChildren(...cards.map(cloneCard));
    section.hidden = cards.length === 0;
  };
  const render = (root) => {
    const reservoir = root.querySelector("[data-curated-calendar-card-reservoir]");
    if (!reservoir) return;
    const controls = {};
    root.querySelectorAll("select[data-curated-calendar-filter]").forEach((select) => {
      controls[select.dataset.curatedCalendarFilter] = select.value;
    });
    const topic = controls.topic || "all";
    const format = controls.format || "live";
    const level = controls.level || "all";
    const month = controls.month || "all";
    const defaults = {
      topic: root.dataset.curatedCalendarDefaultTopic || "all",
      format: root.dataset.curatedCalendarDefaultFormat || "live",
      level: root.dataset.curatedCalendarDefaultLevel || "all",
    };
    const separateSuperstreams = root.dataset.curatedCalendarSeparateSuperstreams === "true";
    const separateSpecialEvents = root.dataset.curatedCalendarSeparateSpecialEvents === "true";
    const cards = Array.from(reservoir.querySelectorAll("[data-curated-calendar-card]"));
    const curated = cards.filter((card) => card.dataset.curatedCalendarCurated === "true");
    const filtered = cards
      .filter((card) => card.dataset.curatedCalendarCurated !== "true")
      .filter((card) =>
        matchesSkill(card, topic) &&
        matchesFormat(card, format) &&
        matchesLevel(card, level) &&
        matchesMonth(card, month))
      .sort(byStart);
    const curatedSection = root.querySelector('[data-curated-calendar-section="curated-for-your-team"]');
    if (curatedSection) {
      fillGrid(curatedSection, curated);
      const countLabel = curatedSection.querySelector("[data-curated-calendar-curated-count]");
      if (countLabel) countLabel.textContent = String(curated.length);
      const isDefault =
        topic === defaults.topic &&
        format === defaults.format &&
        level === defaults.level &&
        month === "all";
      if (!isDefault) setExpanded(curatedSection, false);
    }
    const isChronological = format === "live" || format === "all";
    const chronological = filtered.filter((card) => {
      const type = card.dataset.curatedCalendarContentType || "";
      return (!separateSuperstreams || type !== "superstream") &&
        (!separateSpecialEvents || type !== "special-event");
    });
    const liveLearning = filtered.filter((card) => card.dataset.curatedCalendarContentType === "live-learning");
    const superstreams = filtered.filter((card) => card.dataset.curatedCalendarContentType === "superstream");
    const specialEvents = filtered.filter((card) => card.dataset.curatedCalendarContentType === "special-event");
    const upcoming = root.querySelector('[data-curated-calendar-section="upcoming-live-events"]');
    const liveCourses = root.querySelector('[data-curated-calendar-section="live-courses"]');
    const superstreamsSection = root.querySelector('[data-curated-calendar-section="superstreams"]');
    const specialSection = root.querySelector('[data-curated-calendar-section="special-events"]');
    if (upcoming) {
      if (isChronological) fillGrid(upcoming, chronological);
      else upcoming.hidden = true;
    }
    if (liveCourses) {
      if (!isChronological) fillGrid(liveCourses, liveLearning);
      else liveCourses.hidden = true;
    }
    if (superstreamsSection) {
      const show = (!isChronological || separateSuperstreams) && superstreams.length > 0;
      if (show) fillGrid(superstreamsSection, superstreams);
      else superstreamsSection.hidden = true;
    }
    if (specialSection) {
      const show = (!isChronological || separateSpecialEvents) && specialEvents.length > 0;
      if (show) fillGrid(specialSection, specialEvents);
      else specialSection.hidden = true;
    }
    const empty = root.querySelector("[data-curated-calendar-empty]");
    if (empty) {
      empty.hidden = !(filtered.length === 0 && curated.length === 0);
      empty.querySelectorAll("[data-curated-calendar-show-all-live]").forEach((button) => {
        button.hidden = format === "live" || format === "all";
      });
    }
  };
  const initialize = () => document.querySelectorAll("[data-curated-learning-calendar]").forEach((root) => {
    root.querySelectorAll("select[data-curated-calendar-filter]").forEach((select) => {
      select.addEventListener("change", () => render(root));
    });
    root.querySelectorAll("[data-curated-calendar-collapse-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.closest("[data-curated-calendar-section]");
        const expandedNode = section?.querySelector("[data-curated-calendar-expanded]");
        setExpanded(section, Boolean(expandedNode?.hidden));
      });
    });
    root.querySelectorAll("[data-curated-calendar-show-all-live]").forEach((button) => {
      button.addEventListener("click", () => {
        const format = root.querySelector('select[data-curated-calendar-filter="format"]');
        if (format) format.value = "live";
        render(root);
      });
    });
    render(root);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();


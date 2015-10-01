function TouchScatterPlot (svgEl, data) {
    var GUTTERS = {
            L: 50,
            R: 20,
            T: 50,
            B: 50
        },
        DURATION_COL = "Duration",
        TIME_COL = "Time (secs)",
        JITTER_PERCENT = 0.05; // Jitter percent of duration

    var svg = d3.select(svgEl),
        touchClasses = d3.scale.ordinal().domain("L", "R", "99").range(["touch-left", "touch-right", "touch-body"]),
        activeTimeStart, activeTimeEnd,
        finishTime;

    function init () {
        data.forEach(function (d) {
            d[TIME_COL] = parseInt(d[TIME_COL], 10);
            d[DURATION_COL] = parseInt(d[DURATION_COL], 10);
        });
        var lastRow = data[data.length - 1],
            lastDuration = lastRow[DURATION_COL];
        finishTime = lastRow[TIME_COL];
        if (!isNaN(lastDuration)) {
            finishTime += lastDuration;
        }
        draw();
        d3.select("#checkbox-jitter").on("click", draw);
        d3.select("#checkbox-duration").on("click", durationsToggle);
        d3.selectAll(".marker-left, .marker-right, .marker-body").on("click", legendFilter);
        window.onresize = draw;
    };

    // Do the actual drawing.
    function draw () {
        svg.selectAll("*").remove();
        var boundingRect = svg.node().getBoundingClientRect(),
            width =  boundingRect.width,
            height =  boundingRect.height,
            locationScale = d3.scale.ordinal().domain(util.LOCATIONS.map(function (l) { return l.id; }))
                .rangePoints([GUTTERS.T, height - (GUTTERS.T + GUTTERS.B)]),
            timeScale = d3.scale.linear().range([GUTTERS.L, width - GUTTERS.R]).domain([0, finishTime]);
        (function drawAxes () {
            // Location labels
            var prevLocY = null;
            svg.append("g")
                .selectAll(".row-label")
                .data(util.LOCATIONS)
                .enter()
                .append("text")
                .text(function (d) { return d.id; })
                .attr("x", GUTTERS.L - 8)
                .attr("y", function (d) { return d.y = locationScale(d.id); })
                .attr("dominant-baseline", "central")
                .attr("text-anchor", "end")
                .attr("class", "row-label")
                .each(function (d) {
                    svg.append("line")
                        .attr("class", "tick")
                        .attr("x1", GUTTERS.L - 4)
                        .attr("x2", GUTTERS.L + 4)
                        .attr("y1", d.y)
                        .attr("y2", d.y);
                    if (prevLocY) {
                        var separatorY = (d.y + prevLocY) / 2;
                        svg.append("line")
                            .attr("class", "separator")
                            .attr("x1", GUTTERS.L)
                            .attr("x2", width - GUTTERS.R)
                            .attr("y1", separatorY)
                            .attr("y2", separatorY);
                    }
                    prevLocY = d.y;
                    new Opentip(this, "<b>" + d.id + "</b>" +
                        "</b><br>" + d.name + "<br>" +
                        "<b>" + d.group + "</b>");
                });
            // Bottom (time) axis
            svg.append("line")
                .attr("class", "axis")
                .attr("x1", GUTTERS.L)
                .attr("y1", height - GUTTERS.B)
                .attr("x2", width - GUTTERS.R)
                .attr("y2", height - GUTTERS.B);
            svg.append("text")
                .attr("x", (width - GUTTERS.L) / 2)
                .attr("y", height)
                .text("Time (seconds)");
            svg.append("text")
                .attr("x", GUTTERS.L)
                .attr("y", height)
                .style("text-anchor", "middle")
                .text(0);
            svg.append("text")
                .attr("x", width - GUTTERS.R)
                .attr("y", height)
                .style("text-anchor", "middle")
                .text(finishTime);
            // Borders
            svg.append("line")  // left
                .attr("class", "axis")
                .attr("x1", GUTTERS.L)
                .attr("y1", height - GUTTERS.B)
                .attr("x2", GUTTERS.L)
                .attr("y2", 1);
            svg.append("line")  // top
                .attr("class", "axis")
                .attr("x1", GUTTERS.L)
                .attr("y1", 1)
                .attr("x2", width - (GUTTERS.R + 1))
                .attr("y2", 1);
            svg.append("line")  // right
                .attr("class", "axis")
                .attr("x1", width - (GUTTERS.R + 1))
                .attr("y1", 1)
                .attr("x2", width - (GUTTERS.R + 1))
                .attr("y2", height - GUTTERS.B);
        }());

        (function drawTouches() {
            var touchGroups = svg.selectAll("g.touch").data(data).enter().append("g")
                .attr("class", "touch")
                .on("mouseover", function () {
                    var d = d3.select(this).classed("active", true).datum();
                    activeTimeStart = svg.append("text")
                        .attr("class", "active-time")
                        .attr("text-anchor", "middle")
                        .attr("x", d.x)
                        .attr("y", height - GUTTERS.B + 12)
                        .text(d[TIME_COL]);
                    var duration = d[DURATION_COL];
                    if (!isNaN(duration)) {
                        activeTimeEnd = svg.append("text")
                            .attr("class", "active-time")
                            .attr("text-anchor", "middle")
                            .attr("x", d.x2)
                            .attr("y", height - GUTTERS.B + 24)
                            .text(d[TIME_COL] + duration);
                    }
                })
                .on("mouseout", function () {
                    d3.select(this).classed("active", false);
                    activeTimeStart.remove();
                    activeTimeStart = null;
                    if (activeTimeEnd) {
                        activeTimeEnd.remove();
                        activeTimeEnd = null;
                    }
                });
            touchGroups.append("circle")
                .attr("cx", function (d) { return d.x = timeScale(d[TIME_COL]); })
                .attr("cy", function (d) { return d.y = locationScale(d["Location"]) + randomJitter()})
                .attr("r", 5)
                .attr("class", function (d) {
                    return touchClasses(d["Hand"]);
                }).each(function (d) {
                    var duration = d[DURATION_COL];
                    if (!isNaN(duration)) {
                        d3.select(this.parentNode).append("line")
                            .attr("x1", d.x + 5)
                            .attr("y1", d.y)
                            .attr("x2", d.x2 = timeScale(d[TIME_COL] + duration))
                            .attr("y2", d.y)
                            .attr("class", touchClasses(d["Hand"]));
                    }
                });
        }());

        // Ensure state is consistent
        durationsToggle();
        d3.selectAll(".marker-left, .marker-right, .marker-body").style("opacity", "");
    }

    // Toggle display of duration trails
    function durationsToggle () {
        svg.selectAll("line[class^='touch-']")
            .style("visibility", d3.select("#checkbox-duration").node().checked ? "visible" : "hidden")
    }

    // Called when a legend marker is clicked on to show/hide respective touches.
    function legendFilter () {
        var hand = this.className.split("marker-")[1];
        if (this.style.opacity.length === 0) {
            this.style.opacity = 0.2;
            svg.selectAll(".touch-" + hand).style("visibility", "hidden");
        } else {
            this.style.opacity = "";
            svg.selectAll(".touch-" + hand).style("visibility", "visible");
        }
    }

    // Return a random jitter value, or 0 if jitter is disabled.
    function randomJitter () {
        if (!d3.select("#checkbox-jitter").node().checked) {
            return 0;
        }
        var jitterRange = JITTER_PERCENT * finishTime;
        return Math.random() * jitterRange - jitterRange / 2;
    }

    init();
}
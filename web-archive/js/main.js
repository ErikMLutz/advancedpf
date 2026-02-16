// Finance Dashboard - Main Application
// Alpine.js app initialization and orchestration

document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => ({
        // State
        loading: true,
        error: null,
        rawData: null,
        processedSources: null,
        charts: {},
        selectedColorscheme: CONFIG.defaultColorscheme,
        isRendering: false,

        // Initialize app
        async init() {
            // Check for auto-export mode
            const urlParams = new URLSearchParams(window.location.search);
            const autoExport = urlParams.get('auto-export') === 'true';

            try {
                // Load data
                this.rawData = await loadAllData();

                // Validate data
                const warnings = validateData(this.rawData);
                if (warnings.length > 0) {
                    console.warn('Data validation warnings:', warnings);
                }

                // Process data into source objects
                this.processedSources = this.processSources();

                // Set initial colorscheme
                this.applyColorscheme();

                this.loading = false;

                // Wait for next tick to ensure DOM is ready
                await this.$nextTick();

                // Additional delay for Safari - wait for next animation frame
                await new Promise(resolve => requestAnimationFrame(resolve));
                await new Promise(resolve => requestAnimationFrame(resolve));

                // Extra delay for Safari
                await new Promise(resolve => setTimeout(resolve, 100));

                // Verify canvases exist before rendering
                const canvasIds = ['monthlyMovers', 'netWorth12Month', 'creditSpending', 'assetCategorization', 'allTimeNetWorth'];
                const missingCanvases = canvasIds.filter(id => !document.getElementById(id));
                if (missingCanvases.length > 0) {
                    console.error('Missing canvases:', missingCanvases);
                }

                // Render charts after DOM is ready
                try {
                    this.renderAllCharts();
                } catch (chartError) {
                    console.error('Chart rendering error (non-fatal):', chartError);
                    // Don't let chart errors hide the whole dashboard
                }

                // Auto-export if requested
                if (autoExport) {
                    setTimeout(() => {
                        this.exportPDF();
                    }, 1000);
                }

            } catch (e) {
                console.error('Failed to initialize dashboard:', e);
                this.error = e.message;
                this.loading = false;
            }
        },

        // Process raw data into SnapshotData and EventData objects
        processSources() {
            return {
                cash: new SnapshotData('cash', this.rawData.cash),
                property: new SnapshotData('property', this.rawData.property),
                debt: new SnapshotData('debt', this.rawData.debt),
                securities: new SnapshotData('securities', this.rawData.securities),
                credit: new EventData('credit', this.rawData.credit)
            };
        },

        // Apply selected colorscheme (colors are now handled per-chart)
        applyColorscheme() {
            // No global config needed - colorscheme is passed to each chart
        },

        // Update colorscheme and re-render charts
        updateColorscheme() {
            console.log('[updateColorscheme] Called, new scheme:', this.selectedColorscheme);
            this.applyColorscheme();
            this.renderAllCharts();
        },

        // Render all charts
        renderAllCharts() {
            console.log('[renderAllCharts] Called');

            // Prevent concurrent renders
            if (this.isRendering) {
                console.log('[renderAllCharts] Already rendering, skipping...');
                return;
            }

            this.isRendering = true;
            console.log('[renderAllCharts] Existing charts:', Object.keys(this.charts));

            // Destroy existing charts
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    console.log('[renderAllCharts] Destroying chart');
                    chart.destroy();
                }
            });

            const sources = this.processedSources;
            const allSources = [
                sources.cash,
                sources.property,
                sources.debt,
                sources.credit,
                sources.securities
            ];
            const sourcesLessCredit = [
                sources.cash,
                sources.property,
                sources.debt,
                sources.securities
            ];

            // Create each chart
            try {
                console.log('Starting chart rendering...');

                this.charts.monthlyMovers = createMonthlyMoversChart(
                    'monthlyMovers',
                    allSources,
                    this.selectedColorscheme
                );

                this.charts.netWorth12Month = create12MonthNetWorthChart(
                    'netWorth12Month',
                    sourcesLessCredit,
                    this.selectedColorscheme
                );

                createStatsPanel(
                    'stats',
                    sourcesLessCredit,
                    [sources.property, sources.securities, sources.cash],
                    [sources.debt],
                    [sources.credit]
                );

                this.charts.creditSpending = createSpendingChart(
                    'creditSpending',
                    sources.credit,
                    this.selectedColorscheme
                );

                this.charts.assetCategorization = createAssetCategorizationChart(
                    'assetCategorization',
                    sourcesLessCredit,
                    this.rawData.manifest,
                    this.selectedColorscheme
                );

                this.charts.allTimeNetWorth = createAllTimeNetWorthChart(
                    'allTimeNetWorth',
                    sourcesLessCredit,
                    this.selectedColorscheme
                );

                console.log('All charts rendered successfully');

            } catch (e) {
                console.error('Error rendering charts:', e);
                console.error('Stack trace:', e.stack);
                // Don't hide the entire dashboard on error - just log it
                // this.error = `Failed to render charts: ${e.message}`;
            } finally {
                this.isRendering = false;
            }
        },

        // Export dashboard to PDF
        async exportPDF() {
            try {
                const element = document.getElementById('dashboard');
                if (!element) {
                    throw new Error('Dashboard element not found');
                }

                // Use html2canvas to capture the dashboard
                const canvas = await html2canvas(element, {
                    backgroundColor: '#ffffff',
                    scale: CONFIG.pdf.scale,
                    logging: false,
                    useCORS: true
                });

                // Create PDF with jsPDF
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: CONFIG.pdf.orientation,
                    unit: 'mm',
                    format: CONFIG.pdf.format
                });

                const imgData = canvas.toDataURL('image/png');

                // Calculate dimensions to fit on page
                const imgWidth = 297; // A4 landscape width in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

                // Generate filename with current date
                const today = new Date();
                const filename = `finance-dashboard-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.pdf`;

                pdf.save(filename);

            } catch (e) {
                console.error('Failed to export PDF:', e);
                alert(`Failed to export PDF: ${e.message}`);
            }
        }
    }));
});

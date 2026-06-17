// This script contains the logic for the Special Mode visualizer page.

// Initialize charts when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const stats = await getStats();
        if (stats.matchHistory && stats.matchHistory.length > 0) {
            initializeCharts(stats);
        } else {
            document.getElementById('noDataMessage').style.display = 'block';
        }
    } catch (error) {
        console.error('Error initializing charts:', error);
        document.getElementById('noDataMessage').style.display = 'block';
    }
}); 
/**
 * A simple 1D Kalman filter implementation to smooth out noisy GPS coordinates.
 */
export class KalmanFilter {
    private R: number; // measurement noise variance
    private Q: number; // process noise variance
    private P: number; // estimation error covariance
    private X: number; // value estimate
    private initialized: boolean;

    constructor(R = 1, Q = 0.1) {
        this.R = R;
        this.Q = Q;
        this.P = 1;
        this.X = 0;
        this.initialized = false;
    }

    /**
     * Filters a new measurement.
     * @param measurement The noisy coordinate measurement
     * @returns The smoothed coordinate estimate
     */
    filter(measurement: number): number {
        if (!this.initialized) {
            this.X = measurement;
            this.initialized = true;
            return this.X;
        }

        // Prediction update
        this.P = this.P + this.Q;

        // Measurement update
        const K = this.P / (this.P + this.R); // Kalman gain
        this.X = this.X + K * (measurement - this.X);
        this.P = (1 - K) * this.P;

        return this.X;
    }

    reset(): void {
        this.P = 1;
        this.X = 0;
        this.initialized = false;
    }
}

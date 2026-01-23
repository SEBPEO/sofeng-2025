import styles from './MedicalBackground.module.css';

interface MedicalBackgroundProps {
  variant?: 'light' | 'default';
}

export const MedicalBackground: React.FC<MedicalBackgroundProps> = ({ 
  variant = 'default' 
}) => {
  return (
    <div className={`${styles.background} ${variant === 'light' ? styles.light : ''}`}>
      <svg className={styles.decorativeSvg} xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Teal gradient for pill shape */}
          <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-primary-700)" stopOpacity="0.15" />
          </linearGradient>
          
          {/* Yellow gradient for heart shape */}
          <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-secondary-700)" stopOpacity="0.1" />
          </linearGradient>
          
          {/* Light yellow gradient for background overlay */}
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--color-secondary-700)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        
        {/* Background overlay */}
        <rect width="100%" height="100%" fill="url(#bgGradient)" />
        
        {/* Large pill/capsule shape - top right */}
        <ellipse 
          cx="85%" 
          cy="10%" 
          rx="200" 
          ry="200" 
          fill="url(#tealGradient)"
          className={styles.floatingSlow}
        />
        
        {/* Heart pulse shape - bottom left */}
        <ellipse 
          cx="15%" 
          cy="90%" 
          rx="175" 
          ry="175" 
          fill="url(#yellowGradient)"
          className={styles.floatingFast}
        />
        
        {/* Small accent circles */}
        <circle 
          cx="25%" 
          cy="20%" 
          r="60" 
          fill="url(#tealGradient)"
          className={styles.pulse}
        />
        
        <circle 
          cx="75%" 
          cy="80%" 
          r="80" 
          fill="url(#yellowGradient)"
          className={styles.floatingSlow}
        />
        
        {/* Medical cross */}
        <g className={styles.pulse}>
          <rect x="calc(90% - 3px)" y="calc(15% - 15px)" width="6" height="30" fill="var(--color-primary)" fillOpacity="0.15" />
          <rect x="calc(90% - 15px)" y="calc(15% - 3px)" width="30" height="6" fill="var(--color-primary)" fillOpacity="0.15" />
        </g>
      </svg>
    </div>
  );
};

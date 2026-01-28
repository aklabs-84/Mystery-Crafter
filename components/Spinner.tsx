import React from 'react';

const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className="flex justify-center items-center">
            <div className={`animate-spin rounded-full ${className}`}></div>
        </div>
    );
};

export default Spinner;

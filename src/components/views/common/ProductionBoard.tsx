import React from 'react';
import ResourceStrip from '@/components/ui/ResourceStrip';

export interface ProductionBoardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout helper that keeps all production related views visually aligned.
 *
 * @param props - Content slots for header, main grid and sidebar.
 */
const ProductionBoard: React.FC<ProductionBoardProps> = ({
  title,
  description,
  actions,
  sidebar,
  children,
}) => {
  return (
    <section className="space-y-8 pb-16">
      <ResourceStrip />
      <header className="space-y-3 pt-2">
        <h2 className="text-[clamp(1.8rem,1.2vw+1.5rem,2.4rem)] font-cinzel text-yellow-300">{title}</h2>
        {description && <p className="text-sm text-gray-300">{description}</p>}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-6">{children}</div>
        <aside className="space-y-6">{sidebar}</aside>
      </div>
    </section>
  );
};

export default ProductionBoard;

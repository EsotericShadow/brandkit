import React from 'react';
import Card from '../common/Card_vrf';

interface SectionBlockProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const SectionBlock: React.FC<SectionBlockProps> = ({ id, title, description, children, className = '' }) => {
  return (
    <section id={id} className={className}>
      <Card title={title} description={description}>
        {children}
      </Card>
    </section>
  );
};

export default SectionBlock;


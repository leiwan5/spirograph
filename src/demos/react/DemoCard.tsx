import type { ReactNode } from 'react';

interface Props {
  title: string;
  tag?: string;
  stage: ReactNode;
  toolbar?: ReactNode;
  controls?: ReactNode;
}

export function DemoCard({ title, tag, stage, toolbar, controls }: Props) {
  return (
    <div className="demo-card">
      <div className="demo-card-head">
        <span>{title}</span>
        {tag && <span className="tag">{tag}</span>}
      </div>
      <div className="demo-stage">{stage}</div>
      {toolbar && <div className="demo-toolbar">{toolbar}</div>}
      {controls}
    </div>
  );
}

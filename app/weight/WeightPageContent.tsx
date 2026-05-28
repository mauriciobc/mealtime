"use client";

import { useWeightPage } from './use-weight-page';
import { WeightPageStateViews } from './weight-page-state-views';
import { WeightPageMainView } from './weight-page-sections';

export default function WeightPageContent() {
  const page = useWeightPage();

  if (page.pageState.type !== 'READY') {
    return (
      <WeightPageStateViews
        pageState={page.pageState}
        cats={page.cats}
        handleSelectCat={page.handleSelectCat}
      />
    );
  }

  return <WeightPageMainView {...page} />;
}

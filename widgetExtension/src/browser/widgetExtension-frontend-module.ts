import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetExtensionWidget } from './widgetExtension-widget';
import { WidgetExtensionContribution } from './widgetExtension-contribution';
import { bindViewContribution, FrontendApplicationContribution, WidgetFactory } from '@theia/core/lib/browser';

import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bindViewContribution(bind, WidgetExtensionContribution);
    bind(FrontendApplicationContribution).toService(WidgetExtensionContribution);
    bind(WidgetExtensionWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: WidgetExtensionWidget.ID,
        createWidget: () => ctx.container.get<WidgetExtensionWidget>(WidgetExtensionWidget)
    })).inSingletonScope();
});

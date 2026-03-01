import type { Meta, StoryObj } from '@storybook/react-webpack5';
import DiscountPanel from '../modules/pricing/DiscountPanel';

const meta: Meta<typeof DiscountPanel> = {
  title: 'Pricing/DiscountPanel',
  component: DiscountPanel,
};

export default meta;
type Story = StoryObj<typeof DiscountPanel>;

export const Default: Story = {};
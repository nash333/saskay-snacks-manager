# User Guide
## Saskay Snacks Manager

### Document Information
- **Version**: 1.3.0
- **Last Updated**: December 2024
- **Audience**: End Users, Shop Owners, Staff
- **Prerequisites**: Shopify Store with Admin Access

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Ingredients](#managing-ingredients)
5. [Recipe Management](#recipe-management)
6. [Cost Calculations](#cost-calculations)
7. [Price History & Tracking](#price-history--tracking)
8. [Reports & Analytics](#reports--analytics)
9. [Settings & Configuration](#settings--configuration)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Getting Started

### Welcome to Saskay Snacks Manager

Saskay Snacks Manager is a comprehensive cost management application designed specifically for food businesses using Shopify. Whether you're running a bakery, restaurant, or food production company, our app helps you:

- **Track ingredient costs** with real-time price monitoring
- **Calculate recipe costs** accurately for better pricing decisions  
- **Monitor price changes** with comprehensive history tracking
- **Generate cost reports** for business insights
- **Maintain audit trails** for compliance and accountability

### Prerequisites

Before using Saskay Snacks Manager, ensure you have:

✅ A Shopify store with admin access  
✅ Basic understanding of your ingredient costs  
✅ Recipe information for your products  
✅ Time to set up your initial ingredient database  

---

## Installation

### Step 1: Install from Shopify App Store

1. Visit the **Shopify App Store**
2. Search for "**Saskay Snacks Manager**"
3. Click "**Add app**" on the application page
4. Review the permissions and click "**Install app**"

### Step 2: Initial Setup

After installation, you'll be redirected to the setup wizard:

1. **Welcome Screen**: Overview of features and benefits
2. **Permission Grant**: Confirm app permissions for your store
3. **Initial Configuration**: Set up basic preferences
4. **Sample Data**: Option to load sample ingredients for testing

### Step 3: Access the App

Once installed, access the app through:
- **Shopify Admin** → **Apps** → **Saskay Snacks Manager**
- Or bookmark the direct app URL for quick access

---

## Dashboard Overview

### Main Dashboard

The dashboard provides a comprehensive overview of your cost management data:

#### Quick Stats Cards
- **Total Ingredients**: Number of active ingredients in your database
- **Average Cost**: Average cost per unit across all ingredients
- **Recent Changes**: Number of price changes in the last 30 days
- **Cost Alerts**: Ingredients with significant price changes

#### Recent Activity Feed
- Latest ingredient additions and updates
- Price change notifications
- Recipe cost recalculations
- System notifications and alerts

#### Cost Trend Chart
- Visual representation of cost trends over time
- Filter by ingredient, category, or date range
- Identify seasonal price patterns

### Navigation Menu

**Main Sections**:
- 🏠 **Dashboard**: Overview and quick stats
- 🥕 **Ingredients**: Manage your ingredient database
- 📖 **Recipes**: Create and manage recipes
- 💰 **Cost Analysis**: Calculate and analyze costs
- 📊 **Reports**: Generate cost reports and analytics
- ⚙️ **Settings**: Configure app preferences

---

## Managing Ingredients

### Adding New Ingredients

#### Method 1: Single Ingredient Entry

1. Navigate to **Ingredients** → **Add New**
2. Fill in the required information:
   - **Name**: Ingredient name (e.g., "All-Purpose Flour")
   - **Cost per Unit**: Current cost (e.g., 2.50)
   - **Unit Type**: Select weight, volume, or each
   - **Category**: Optional categorization
   - **Supplier**: Optional supplier information
   - **Description**: Optional notes

3. Click **Save Ingredient**

#### Method 2: Bulk Import

1. Navigate to **Ingredients** → **Import**
2. Download the **CSV template**
3. Fill in your ingredient data
4. Upload the completed CSV file
5. Review and confirm the import

**CSV Format Example**:
```csv
Name,Cost per Unit,Unit Type,Category,Supplier,Description
All-Purpose Flour,2.50,weight,grains,Local Mills,Basic baking flour
Granulated Sugar,1.80,weight,sweeteners,Sugar Co,White granulated sugar
Vanilla Extract,25.00,volume,flavorings,Flavor House,Pure vanilla extract
```

### Viewing and Managing Ingredients

#### Ingredients List View

The ingredients list provides a comprehensive view of all your ingredients:

- **Search Bar**: Quick search by ingredient name
- **Filter Options**: 
  - Category filter
  - Active/Inactive status
  - Cost range filter
  - Unit type filter
- **Sort Options**: 
  - Alphabetical (A-Z, Z-A)
  - Cost (Low to High, High to Low)
  - Recently Added
  - Recently Updated

#### Ingredient Details Page

Click on any ingredient to view detailed information:

**Overview Tab**:
- Basic ingredient information
- Current cost and unit type
- Creation and last update dates
- Active/inactive status

**Price History Tab**:
- Complete price change history
- Price trend chart
- Change reasons and user attribution
- Export price history data

**Usage Tab**:
- Recipes using this ingredient
- Frequency of use
- Impact analysis of price changes

### Updating Ingredients

#### Editing Basic Information

1. Select the ingredient from the list
2. Click **Edit** button
3. Modify the required fields
4. Add a **change reason** (recommended)
5. Click **Save Changes**

#### Price Updates

When updating ingredient costs:

1. Enter the new **cost per unit**
2. **Change reason** is required for price updates
3. The system automatically:
   - Calculates percentage change
   - Creates price history entry
   - Updates affected recipe costs
   - Generates audit trail

**Common Change Reasons**:
- Supplier price increase
- Market fluctuation
- Seasonal adjustment
- Bulk discount received
- Quality upgrade
- New supplier

### Managing Ingredient Categories

#### Default Categories

The app includes common ingredient categories:
- **Grains & Flours**
- **Sweeteners**
- **Dairy & Eggs**
- **Fats & Oils**
- **Flavorings & Spices**
- **Fruits & Vegetables**
- **Proteins**
- **Additives & Preservatives**

#### Custom Categories

1. Navigate to **Settings** → **Categories**
2. Click **Add Category**
3. Enter category name and description
4. Choose category color for visual identification
5. Save the new category

### Ingredient Status Management

#### Active vs. Inactive Ingredients

- **Active**: Currently used ingredients (shown by default)
- **Inactive**: Discontinued or temporarily unused ingredients

#### Soft Delete Feature

Instead of permanently deleting ingredients:
1. Mark ingredients as **inactive**
2. Preserve price history and audit trails
3. Remove from active ingredient lists
4. Maintain data integrity for historical recipes

---

## Recipe Management

### Creating Recipes

#### Basic Recipe Information

1. Navigate to **Recipes** → **Add New Recipe**
2. Enter basic information:
   - **Recipe Name**: Descriptive name
   - **Description**: Brief recipe description
   - **Category**: Recipe type (desserts, breads, etc.)
   - **Serving Size**: Number of servings/units produced
   - **Prep Time**: Preparation time in minutes
   - **Cook Time**: Cooking time in minutes

#### Adding Ingredients to Recipes

1. In the **Ingredients** section, click **Add Ingredient**
2. Search and select the ingredient
3. Enter the **quantity** needed
4. Select the **unit** (will auto-convert if needed)
5. Repeat for all recipe ingredients

**Example**:
```
Ingredient: All-Purpose Flour
Quantity: 2.5
Unit: cups (auto-converts to weight if needed)
```

#### Recipe Instructions

1. In the **Instructions** section, add step-by-step directions
2. Use the rich text editor for formatting
3. Add cooking temperatures, times, and techniques
4. Include any special notes or tips

### Recipe Cost Calculation

#### Automatic Cost Calculation

The system automatically calculates:
- **Total Recipe Cost**: Sum of all ingredient costs
- **Cost per Serving**: Total cost ÷ serving size
- **Cost Breakdown**: Individual ingredient costs
- **Cost Percentage**: Each ingredient's contribution to total cost

#### Cost Analysis View

**Cost Breakdown Table**:
| Ingredient | Quantity | Unit Cost | Total Cost | % of Recipe |
|------------|----------|-----------|------------|-------------|
| Flour | 2.5 cups | $2.50/kg | $0.625 | 28.9% |
| Sugar | 1 cup | $1.80/kg | $0.360 | 16.7% |
| Butter | 0.5 cups | $8.00/kg | $1.000 | 46.3% |
| **Total** | | | **$2.165** | **100%** |

**Per Serving Cost**: $2.165 ÷ 24 servings = **$0.090 per cookie**

### Recipe Versioning

#### Version Control Features

- **Automatic Versioning**: New version created when ingredients change
- **Version History**: Track all recipe modifications
- **Version Comparison**: Compare ingredient lists between versions
- **Cost Impact Analysis**: See how changes affect total cost

#### Managing Recipe Versions

1. View **Version History** tab in recipe details
2. Compare versions side-by-side
3. Restore previous versions if needed
4. Export version comparison reports

### Recipe Categories and Organization

#### Organizing Recipes

- **Categories**: Group recipes by type (desserts, breads, mains)
- **Tags**: Add custom tags for better organization
- **Favorites**: Mark frequently used recipes
- **Search**: Quick search by name, ingredient, or tag

#### Batch Recipe Management

- **Duplicate Recipes**: Create variations quickly
- **Bulk Updates**: Update multiple recipes simultaneously
- **Export/Import**: Transfer recipes between systems
- **Template Creation**: Save recipe templates for quick creation

---

## Cost Calculations

### Understanding Cost Components

#### Direct Ingredient Costs

- **Primary Costs**: Main ingredient costs
- **Secondary Costs**: Minor ingredients (spices, additives)
- **Waste Factor**: Optional percentage for ingredient waste
- **Yield Adjustments**: Account for cooking loss/gain

#### Cost Calculation Methods

**Method 1: Standard Costing**
- Uses current ingredient prices
- Real-time cost updates
- Suitable for dynamic pricing

**Method 2: Average Costing**
- Uses historical average prices
- Smooths out price volatility
- Better for stable pricing strategies

### Profitability Analysis

#### Pricing Strategy Tools

**Cost-Plus Pricing**:
1. Calculate total ingredient cost
2. Add desired markup percentage
3. Consider overhead and labor costs
4. Set final selling price

**Example Calculation**:
```
Ingredient Cost: $2.165
Markup (300%): $6.495
Suggested Price: $8.66 per recipe (24 servings)
Price per Serving: $0.36
```

#### Margin Analysis

**Gross Margin Calculation**:
- **Selling Price**: $4.50 per serving
- **Ingredient Cost**: $0.090 per serving
- **Gross Margin**: $4.41 per serving
- **Margin Percentage**: 98% margin

#### Break-Even Analysis

Calculate break-even points considering:
- Fixed costs (rent, equipment, labor)
- Variable costs (ingredients, packaging)
- Desired profit margins
- Sales volume requirements

### Cost Monitoring and Alerts

#### Price Change Alerts

Set up automatic alerts for:
- **Significant Price Increases**: >10% increase
- **Cost Threshold Exceeded**: Total recipe cost above limit
- **Margin Compression**: When margins fall below target
- **Seasonal Price Patterns**: Historical price trend alerts

#### Cost Variance Reports

Monitor cost changes with:
- **Daily Cost Variance**: Day-over-day changes
- **Weekly Trend Reports**: Weekly cost summaries
- **Monthly Analysis**: Month-over-month comparisons
- **Quarterly Reviews**: Quarterly cost analysis

---

## Price History & Tracking

### Understanding Price History

#### Price History Features

- **Complete Change Log**: Every price change is recorded
- **Change Attribution**: Who made the change and when
- **Reason Tracking**: Why the price was changed
- **Delta Calculations**: Percentage and absolute changes
- **Trend Analysis**: Visual price trend charts

#### Price History Display

**History Table**:
| Date | Old Price | New Price | Change | % Change | Changed By | Reason |
|------|-----------|-----------|---------|----------|------------|---------|
| 2024-12-20 | $2.50 | $2.75 | +$0.25 | +10.0% | John Smith | Supplier increase |
| 2024-11-15 | $2.25 | $2.50 | +$0.25 | +11.1% | Jane Doe | Market adjustment |

### Price Tracking Tools

#### Price Trend Charts

Visual representations of price changes:
- **Line Charts**: Price over time
- **Bar Charts**: Change magnitude comparison
- **Seasonal Patterns**: Identify recurring trends
- **Volatility Indicators**: Price stability metrics

#### Price Comparison Tools

- **Supplier Comparison**: Compare prices across suppliers
- **Market Benchmarking**: Compare to market averages
- **Historical Comparison**: Compare to historical prices
- **Category Analysis**: Compare within ingredient categories

### Automated Price Monitoring

#### External Price Integration

Connect with external data sources:
- **Supplier APIs**: Automatic price updates from suppliers
- **Market Data Feeds**: Real-time commodity prices
- **Industry Reports**: Periodic price surveys
- **Manual Import**: CSV/Excel price updates

#### Price Alert System

Configurable alerts for:
- **Price Increases**: Above specified threshold
- **Price Decreases**: Significant price drops
- **Volatility Alerts**: Excessive price fluctuation
- **Stale Price Warnings**: Prices not updated recently

---

## Reports & Analytics

### Standard Reports

#### Cost Summary Report

**Monthly Cost Summary**:
- Total ingredient spending
- Average cost per unit trends
- Category-wise cost breakdown
- Top 10 most expensive ingredients
- Price change impact analysis

#### Recipe Cost Report

**Recipe Profitability Analysis**:
- Cost per recipe/serving
- Profit margins by recipe
- Most/least profitable recipes
- Ingredient cost contribution analysis
- Price sensitivity analysis

#### Price History Report

**Price Change Analysis**:
- Price changes by time period
- Ingredient volatility rankings
- Supplier price comparison
- Seasonal price pattern analysis
- Cost impact on recipes

### Custom Reports

#### Report Builder

Create custom reports with:
- **Flexible Date Ranges**: Any time period
- **Multiple Filters**: Category, supplier, price range
- **Custom Metrics**: Calculate specific KPIs
- **Visual Charts**: Graphs and charts
- **Export Options**: PDF, Excel, CSV formats

#### Scheduled Reports

Set up automated reports:
- **Daily**: Price change alerts
- **Weekly**: Cost summary reports
- **Monthly**: Comprehensive analysis
- **Quarterly**: Business review reports

### Analytics Dashboard

#### Key Performance Indicators (KPIs)

Track important metrics:
- **Cost Variance**: Budget vs. actual costs
- **Price Volatility**: Ingredient price stability
- **Recipe Profitability**: Margin analysis by recipe
- **Supplier Performance**: Price and reliability metrics
- **Inventory Turnover**: Usage frequency analysis

#### Data Visualization

**Chart Types Available**:
- Line charts for trends
- Bar charts for comparisons
- Pie charts for composition
- Scatter plots for correlations
- Heat maps for pattern analysis

---

## Settings & Configuration

### General Settings

#### App Preferences

**Display Settings**:
- **Currency**: Set your local currency
- **Date Format**: Choose preferred date format
- **Number Format**: Decimal places and separators
- **Time Zone**: Set your business time zone

**Default Values**:
- **Default Unit Type**: Weight, volume, or each
- **Default Category**: For new ingredients
- **Default Markup**: Standard markup percentage
- **Waste Factor**: Default waste percentage

#### User Management

**User Roles** (if multi-user setup):
- **Admin**: Full access to all features
- **Manager**: Access to data and reports
- **Staff**: Limited access to ingredient entry
- **Viewer**: Read-only access

### Notification Settings

#### Alert Configuration

**Price Change Alerts**:
- **Threshold**: Minimum percentage change for alerts
- **Frequency**: Real-time, daily, or weekly
- **Recipients**: Who receives alerts
- **Delivery Method**: Email, in-app, or both

**System Notifications**:
- **Data Import Results**: Import success/failure
- **Backup Status**: Backup completion alerts
- **System Updates**: App update notifications
- **Maintenance Windows**: Scheduled maintenance alerts

### Integration Settings

#### Shopify Integration

**Data Sync Settings**:
- **Product Sync**: Link recipes to Shopify products
- **Inventory Integration**: Connect with Shopify inventory
- **Order Analysis**: Cost analysis of actual orders
- **Automatic Updates**: Sync frequency settings

#### External Integrations

**Accounting Software**:
- QuickBooks integration
- Xero integration
- Custom API connections
- Export formats for other systems

**Supplier Integration**:
- Supplier API connections
- Automated price updates
- Purchase order integration
- Invoice processing automation

### Backup and Data Management

#### Data Export

**Export Options**:
- **Complete Data Export**: All ingredients, recipes, and history
- **Selective Export**: Choose specific data types
- **Format Options**: CSV, Excel, JSON formats
- **Scheduled Exports**: Automatic regular exports

#### Data Import

**Import Capabilities**:
- **CSV Import**: Bulk ingredient and recipe import
- **Migration Tools**: Import from other systems
- **Data Validation**: Automatic data quality checks
- **Error Handling**: Detailed import error reports

---

## Troubleshooting

### Common Issues

#### Issue: Ingredient Not Saving

**Symptoms**: Error message when saving new ingredient

**Solutions**:
1. Check all required fields are filled
2. Ensure cost per unit is a positive number
3. Verify ingredient name is unique
4. Check internet connection
5. Refresh page and try again

#### Issue: Price History Not Updating

**Symptoms**: Price changes not appearing in history

**Solutions**:
1. Ensure you provided a change reason
2. Check that the price actually changed
3. Verify you have permission to edit prices
4. Clear browser cache and reload
5. Contact support if issue persists

#### Issue: Recipe Costs Not Calculating

**Symptoms**: Recipe cost shows as $0.00 or incorrect amount

**Solutions**:
1. Verify all ingredients have valid costs
2. Check ingredient quantities are positive numbers
3. Ensure ingredients are active
4. Refresh the recipe page
5. Check for any inactive ingredients in recipe

#### Issue: Reports Not Loading

**Symptoms**: Report pages show loading spinner indefinitely

**Solutions**:
1. Check internet connection
2. Try a smaller date range
3. Clear browser cache
4. Disable browser extensions
5. Try a different browser

### Performance Optimization

#### App Performance Tips

1. **Regular Cleanup**: Remove inactive ingredients periodically
2. **Optimize Searches**: Use specific search terms
3. **Limit Date Ranges**: Use shorter periods for reports
4. **Browser Maintenance**: Clear cache regularly
5. **Update Browser**: Use latest browser version

#### Data Management Best Practices

1. **Regular Backups**: Export data monthly
2. **Price Updates**: Keep ingredient prices current
3. **Recipe Maintenance**: Update recipes when ingredients change
4. **Category Organization**: Keep categories well-organized
5. **User Training**: Train all users on best practices

### Getting Help

#### Support Channels

**In-App Help**:
- Help tooltips throughout the app
- Video tutorials for common tasks
- FAQ section with searchable answers
- Feature documentation and guides

**Direct Support**:
- **Email Support**: support@saskaysnacks.com
- **Live Chat**: Available during business hours
- **Phone Support**: For urgent issues
- **Community Forum**: User community discussions

**Self-Service Resources**:
- **Knowledge Base**: Comprehensive help articles
- **Video Library**: Step-by-step tutorials
- **Webinars**: Regular training sessions
- **Blog**: Tips, tricks, and best practices

---

## FAQ

### General Questions

**Q: How much does the app cost?**
A: Please visit our pricing page for current subscription plans and pricing information.

**Q: Is there a free trial available?**
A: Yes, we offer a 14-day free trial with full access to all features.

**Q: Can I import data from my existing system?**
A: Yes, we support CSV imports and can help with data migration from most systems.

**Q: Is my data secure?**
A: Yes, we use enterprise-grade security with encryption and regular backups. All data is shop-scoped and isolated.

### Feature Questions

**Q: Can I track multiple suppliers for the same ingredient?**
A: Currently, each ingredient tracks one supplier, but you can add supplier information in the notes field for reference.

**Q: How accurate are the cost calculations?**
A: Cost calculations are based on the ingredient prices you enter. Accuracy depends on keeping your ingredient costs up to date.

**Q: Can I export my recipe costs?**
A: Yes, you can export recipe cost reports in PDF, Excel, or CSV formats.

**Q: Does the app work on mobile devices?**
A: Yes, the app is responsive and works on tablets and smartphones through your web browser.

### Technical Questions

**Q: What browsers are supported?**
A: We support Chrome, Firefox, Safari, and Edge (latest versions recommended).

**Q: Is internet connection required?**
A: Yes, the app requires an internet connection as it's a cloud-based application.

**Q: How often is data backed up?**
A: Data is automatically backed up daily, with real-time replication for security.

**Q: Can multiple users access the app simultaneously?**
A: Yes, multiple users can access the app at the same time with proper user management setup.

---

## Contact and Support

### Support Information

**Technical Support**:
- **Email**: support@saskaysnacks.com
- **Response Time**: Within 24 hours
- **Hours**: Monday-Friday, 9 AM - 5 PM EST

**Sales and Billing**:
- **Email**: sales@saskaysnacks.com
- **Phone**: 1-800-SASKAY-1
- **Hours**: Monday-Friday, 8 AM - 6 PM EST

**Community Resources**:
- **User Forum**: [community.saskaysnacks.com](https://community.saskaysnacks.com)
- **Knowledge Base**: [help.saskaysnacks.com](https://help.saskaysnacks.com)
- **Video Tutorials**: [youtube.com/saskaysnacks](https://youtube.com/saskaysnacks)

### Feedback and Suggestions

We value your feedback! Contact us through:
- **Feature Requests**: [feedback.saskaysnacks.com](https://feedback.saskaysnacks.com)
- **Bug Reports**: support@saskaysnacks.com
- **General Feedback**: hello@saskaysnacks.com

---

**Document Version**: 1.3.0  
**Last Updated**: December 2024  
**Next Review**: March 2025

*Thank you for choosing Saskay Snacks Manager for your cost management needs!*
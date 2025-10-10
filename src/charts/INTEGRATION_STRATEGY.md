/**
 * Annie Chart System - Integration Strategy
 * 
 * This document outlines how to integrate D3.js charts with Annie Framework
 * while preserving existing chart logic and enabling JsonLogic functionality.
 */

## 🏗️ **Recommended Architecture**

### **File Structure**
```
src/charts/
├── chart-processor.ts        # Main Annie chart processor
├── chart-types/             # Individual chart implementations
│   ├── pie-chart.ts         # Port of gradPie logic
│   ├── dashboard-chart.ts   # Port of createDashboard logic
│   ├── bar-chart.ts         # New D3.js bar chart
│   └── line-chart.ts        # New D3.js line chart
├── d3-types.ts              # D3.js TypeScript definitions
└── index.ts                 # Chart system exports

public/libs/
├── d3.min.js               # D3.js library (CDN or local)
└── charts/                 # Compiled chart modules
    ├── pie-chart.js
    ├── dashboard-chart.js
    └── ...
```

### **Integration Strategy**

#### **1. Separate D3.js Loading (Recommended)**
```typescript
// Load D3.js only when charts are needed
async loadChartLibraries() {
    if (!window.d3) {
        await this.loadScript('/libs/d3.min.js');
    }
    // Load specific chart types as needed
}
```

#### **2. Chart Type Registration**
```typescript
// Register your existing chart functions
class ChartRegistry {
    register(type: string, renderer: ChartRenderer) {
        this.chartTypes.set(type, renderer);
    }
}

// Port existing logic as chart renderers
class DashboardChartRenderer extends ChartRenderer {
    render(svg, data, config) {
        // Your existing createDashboard logic goes here
        this.createDashboard(svg.node().id, data, config.drillid, config.filter, config.title);
    }
    
    private createDashboard(id, data, drillid, filter, title) {
        // Port your existing function here with minimal changes
    }
}
```

#### **3. Data Attribute Processing**
```html
<!-- Your existing chart becomes: -->
<div data-annie-chart="dashboard"
     data-source="sales-data"
     data-drillid="drilldownid" 
     data-filter="filter"
     data-title="Client Usage"
     data-width="450"
     data-height="250">
</div>

<!-- With JsonLogic enhancement: -->
<div data-annie-chart='{"jsonlogic": {"if": [{"var": "isMobile"}, "pie", "dashboard"]}}'
     data-source="sales-data"
     data-title='{"jsonlogic": {"cat": [{"var": "user.name"}, " - Client Usage"]}}'
     data-colors='{"jsonlogic": {"if": [{"==": [{"var": "theme"}, "dark"]}, ["#64ffda", "#ff6b9d"], ["#007bff", "#28a745"]]}}'>
</div>
```

## 🔄 **Porting Your Existing Code**

### **Step 1: Extract Chart Logic**
```typescript
// Your existing createDashboard function becomes:
class LegacyDashboardRenderer {
    createDashboard(id: string, data: any[], drillid: string, filter: string, title: string) {
        // Your existing logic with minimal modifications:
        const svg = d3.select("#" + id).append("svg")
            .attr("width", 450)
            .attr("height", 250);
        
        svg.append("g").attr("id", id + "pie");
        
        // Use your gradPie (keep as external dependency)
        if (window.gradPie) {
            window.gradPie.draw(id + "pie", this.piedata(data), 125, 130, 100);
        }
        
        // Rest of your legend/title logic...
        this.createLegend(svg, data, title);
    }
    
    private piedata(data: any[]) {
        return data.map(d => ({
            label: d.label,
            value: d.value, 
            color: d.color,
            drillid: d.drillid
        }));
    }
    
    // Port your createTitle logic as createLegend
    private createLegend(svg: any, data: any[], title: string) {
        // Your existing createTitle function logic
    }
}
```

### **Step 2: Annie Integration Wrapper**
```typescript
class AnnieDashboardChart extends ChartRenderer {
    private legacyRenderer = new LegacyDashboardRenderer();
    
    render(svg: any, data: ChartData[], config: ChartConfig, element: HTMLElement) {
        // Convert Annie data format to your legacy format
        const legacyData = data.map(item => ({
            label: item.label,
            value: item.value,
            color: item.color,
            drillid: item.drillid
        }));
        
        // Call your existing function
        this.legacyRenderer.createDashboard(
            element.id,
            legacyData, 
            config.drillid || 'default',
            config.filter || '',
            config.title || ''
        );
    }
}
```

## 🎯 **Adding New Chart Types**

### **Simple Process:**
```typescript
// 1. Create new chart renderer
class MyNewChartRenderer extends ChartRenderer {
    render(svg: any, data: ChartData[], config: ChartConfig, element: HTMLElement) {
        // Your D3.js chart logic here
        const width = config.width || 400;
        const height = config.height || 300;
        
        // D3.js implementation...
    }
}

// 2. Register it
chartProcessor.registerChart('mynewchart', new MyNewChartRenderer());

// 3. Use in HTML
// <div data-annie-chart="mynewchart" data-source="mydata"></div>
```

## 🔥 **JsonLogic Integration Benefits**

### **Your Dashboard with Smart Conditions:**
```html
<div data-annie-chart="dashboard"
     data-source="client-usage-data"
     data-title='{"jsonlogic": {"cat": [{"var": "selectedClient"}, " Usage Dashboard"]}}'
     data-colors='{"jsonlogic": {
        "if": [{"==": [{"var": "user.role"}, "admin"]}, 
               ["#007bff", "#28a745", "#dc3545"],
               ["#6c757d", "#6c757d", "#6c757d"]]
     }}'
     data-drillid='{"jsonlogic": {
        "if": [{"var": "user.canDrillDown"}, "drill-enabled", ""]
     }}'>
</div>
```

**This enables:**
- ✅ Dynamic titles based on selected data
- ✅ Role-based color schemes  
- ✅ Conditional drill-down permissions
- ✅ Responsive chart type switching
- ✅ All with your existing D3.js logic!

## 📋 **Implementation Checklist**

### **Phase 1: Basic Integration (Week 1)**
- [ ] Create chart processor infrastructure
- [ ] Port createDashboard as DashboardRenderer  
- [ ] Port gradPie logic (or keep as external)
- [ ] Test with existing data format

### **Phase 2: Annie Enhancement (Week 2)**  
- [ ] Add data attribute parsing
- [ ] Integrate with Annie DataStore
- [ ] Add observer system for real-time updates
- [ ] Test JsonLogic basic functionality

### **Phase 3: JsonLogic Power (Week 3)**
- [ ] Add conditional chart types
- [ ] Add dynamic styling/colors
- [ ] Add role-based data filtering  
- [ ] Add responsive behaviors

### **Phase 4: New Chart Types (Week 4)**
- [ ] Add standard bar chart
- [ ] Add line chart
- [ ] Add scatter plot
- [ ] Performance optimization

## 💡 **Key Decision Points**

1. **D3.js Loading:** Separate file (recommended) vs bundled
2. **Legacy Code:** Port with minimal changes vs full rewrite  
3. **gradPie Dependency:** Keep external vs port to D3.js standard
4. **Chart Registration:** Static vs dynamic loading

**Recommendation:** Start with separate D3.js file, port legacy code with minimal changes, and keep gradPie external initially. This gives you the fastest path to a working system while preserving your existing chart logic.

The JsonLogic integration will make this the most advanced charting system available - no framework offers this level of intelligent, conditional visualization!
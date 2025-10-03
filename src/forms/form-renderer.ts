/**
 * Form Rendering Utilities
 * Provides utilities for rendering reactive forms in the DOM with Annie's trigger system integration
 */

import { ReactiveForm, FormField, FormFieldType } from './reactive-form.js';
import { TriggerHandler } from '../ui/trigger-handler.js';
import { Observable } from '../core/observable.js';

export interface FormRenderOptions {
  containerSelector?: string;
  layout?: {
    type?: 'default' | 'grid' | 'flexbox';
    columns?: number; // For grid layout (default: 12)
    gap?: string; // CSS gap value
    breakpoints?: {
      xs?: number; // Mobile
      sm?: number; // Tablet  
      md?: number; // Desktop
      lg?: number; // Large desktop
      xl?: number; // Extra large
    };
  };
  cssClasses?: {
    form?: string;
    fieldGroup?: string;
    label?: string;
    input?: string;
    error?: string;
    warning?: string;
    success?: string;
    row?: string; // Grid row class
    column?: string; // Grid column base class
  };
  showValidationMessages?: boolean;
  validateOnBlur?: boolean;
  validateOnInput?: boolean;
  autoFocus?: boolean;
}

export interface FormFieldConfig {
  name: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  options?: { value: any; label: string; disabled?: boolean }[];
  validators?: Array<(value: any, field: FormField) => import('../utils/type-guards.js').ValidationResult>;
  attributes?: Record<string, string | number | boolean>;
  cssClass?: string;
  helpText?: string;
  layout?: {
    // Bootstrap-style grid positioning
    column?: number; // Column span (1-12)
    offset?: number; // Column offset (0-11)
    row?: number; // Explicit row number (optional)
    order?: number; // CSS order property
    
    // Responsive breakpoints (Bootstrap style)
    xs?: { column?: number; offset?: number; order?: number };
    sm?: { column?: number; offset?: number; order?: number };
    md?: { column?: number; offset?: number; order?: number };
    lg?: { column?: number; offset?: number; order?: number };
    xl?: { column?: number; offset?: number; order?: number };
    
    // Alternative positioning methods
    gridArea?: string; // CSS Grid area name
    selector?: string; // Target existing container by selector
    containerId?: string; // Target existing container by ID
    
    // Table cell targeting for datatables/dynamic rows
    tableRowId?: string; // Target specific table row by ID
    tableRowSelector?: string; // Target table row by selector (e.g., 'tr[data-id="123"]')
    tableCellIndex?: number; // Target cell by index (0-based column)
    tableCellSelector?: string; // Target specific cell by selector
    tableRowData?: any; // Data to associate with the table row
    createTableRow?: boolean; // Create new table row if not found
    tableContainer?: string; // Table or tbody selector to append new rows
    
    // Advanced positioning
    newRow?: boolean; // Force start a new row
    fullWidth?: boolean; // Span full width (column: 12)
  };
}

export class FormRenderer {
  private form: ReactiveForm;
  private container: HTMLElement | null = null;
  private options: FormRenderOptions;
  private triggerHandler?: TriggerHandler;
  private subscriptions: Array<{ unsubscribe: () => void }> = [];

  constructor(form: ReactiveForm, options: FormRenderOptions = {}, triggerHandler?: TriggerHandler) {
    this.form = form;
    this.options = {
      showValidationMessages: true,
      validateOnBlur: true,
      validateOnInput: false,
      autoFocus: false,
      layout: {
        type: 'default',
        columns: 12,
        gap: '15px'
      },
      cssClasses: {
        form: 'annie-form',
        fieldGroup: 'annie-field-group',
        label: 'annie-label',
        input: 'annie-input',
        error: 'annie-error',
        warning: 'annie-warning',
        success: 'annie-success',
        row: 'annie-row',
        column: 'annie-col'
      },
      ...options
    };
    this.triggerHandler = triggerHandler;
  }

  /**
   * Render the form in the specified container
   */
  render(containerSelector?: string): void {
    const selector = containerSelector || this.options.containerSelector;
    if (!selector) {
      throw new Error('Container selector is required');
    }

    this.container = document.querySelector(selector);
    if (!this.container) {
      throw new Error(`Container element not found: ${selector}`);
    }

    this.renderFormElement();
    this.bindEvents();
    this.subscribeToFormState();
  }

  /**
   * Add a field to the form and render it
   */
  addField(config: FormFieldConfig, position?: {
    insertAfter?: string;  // Insert after this field name
    insertBefore?: string; // Insert before this field name
    insertAt?: number;     // Insert at specific index
  }): void {
    this.form.addField(config.name, {
      type: config.type,
      label: config.label,
      value: null,
      validation: config.validators ? config.validators.map(validator => ({
        type: 'custom' as const,
        validator: validator
      })) : undefined,
      required: config.required || false,
      disabled: config.disabled || false,
      readonly: config.readonly || false
    });

    if (this.container) {
      this.renderField(config, position);
    }
  }

  /**
   * Remove a field from the form and DOM
   */
  removeField(fieldName: string): void {
    this.form.removeField(fieldName);
    
    if (this.container) {
      const fieldGroup = this.container.querySelector(`[data-field="${fieldName}"]`);
      if (fieldGroup) {
        fieldGroup.remove();
      }
    }

    // Field-specific cleanup handled by destroy method
  }

  /**
   * Update field configuration
   */
  updateField(fieldName: string, updates: Partial<FormFieldConfig>): void {
    const field = this.form.getField(fieldName);
    if (!field) return;

    // Update form field
    Object.assign(field, updates);

    // Re-render field in DOM
    if (this.container) {
      const fieldGroup = this.container.querySelector(`[data-field="${fieldName}"]`);
      if (fieldGroup) {
        fieldGroup.replaceWith(this.createFieldElement(fieldName, {
          name: fieldName,
          type: field.type,
          label: field.label,
          ...updates
        }));
      }
    }
  }

  /**
   * Destroy the form renderer and clean up
   */
  destroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(subscription => subscription.unsubscribe());

    // Remove form from DOM
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  private renderFormElement(): void {
    if (!this.container) return;

    const form = document.createElement('form');
    form.className = this.options.cssClasses?.form || 'annie-form';
    form.setAttribute('data-annie-form', this.form.getName());

    // Add novalidate to prevent browser validation
    form.setAttribute('novalidate', 'true');

    // Set up grid layout if specified
    if (this.options.layout?.type === 'grid') {
      this.setupGridLayout(form);
    }

    // Render all existing fields with layout consideration
    if (this.options.layout?.type === 'grid') {
      this.renderFieldsWithGrid(form);
    } else {
      // Default rendering
      Object.keys(this.form.getFields()).forEach(fieldName => {
        const field = this.form.getField(fieldName);
        if (field) {
          const fieldConfig: FormFieldConfig = {
            name: fieldName,
            type: field.type,
            label: field.label,
            required: field.required,
            disabled: field.disabled,
            readonly: field.readonly
          };
          form.appendChild(this.createFieldElement(fieldName, fieldConfig));
        }
      });
    }

    this.container.innerHTML = '';
    this.container.appendChild(form);
  }

  private renderField(config: FormFieldConfig, position?: {
    insertAfter?: string;
    insertBefore?: string;
    insertAt?: number;
  }): void {
    if (!this.container) return;

    const newFieldElement = this.createFieldElement(config.name, config);
    
    // Apply grid layout if configured
    if (this.options.layout?.type === 'grid' && config.layout) {
      this.applyGridLayout(newFieldElement, config.layout);
    }

    // Determine target container
    let targetContainer: HTMLElement;
    
    // Check for table cell targeting first (highest priority)
    const tableCellTarget = this.resolveTableCellTarget(config);
    if (tableCellTarget) {
      // For table cells, we typically don't want the full field wrapper
      const fieldInput = this.createTableCellField(config);
      tableCellTarget.appendChild(fieldInput);
      return;
    }
    
    // Check for specific container targeting from layout config
    if (config.layout?.selector) {
      const customContainer = document.querySelector(config.layout.selector);
      if (customContainer instanceof HTMLElement) {
        customContainer.appendChild(newFieldElement);
        return;
      }
    }
    
    if (config.layout?.containerId) {
      const customContainer = document.getElementById(config.layout.containerId);
      if (customContainer) {
        customContainer.appendChild(newFieldElement);
        return;
      }
    }
    
    // Default to form container
    const form = this.container.querySelector('form');
    if (!form) return;
    targetContainer = form;

    // Handle positioning within target container
    if (position) {
      if (position.insertAfter) {
        const referenceField = targetContainer.querySelector(`[data-field="${position.insertAfter}"]`);
        if (referenceField && referenceField.nextSibling) {
          targetContainer.insertBefore(newFieldElement, referenceField.nextSibling);
        } else {
          targetContainer.appendChild(newFieldElement);
        }
      } else if (position.insertBefore) {
        const referenceField = targetContainer.querySelector(`[data-field="${position.insertBefore}"]`);
        if (referenceField) {
          targetContainer.insertBefore(newFieldElement, referenceField);
        } else {
          targetContainer.appendChild(newFieldElement);
        }
      } else if (typeof position.insertAt === 'number') {
        const children = Array.from(targetContainer.children);
        if (position.insertAt >= 0 && position.insertAt < children.length) {
          targetContainer.insertBefore(newFieldElement, children[position.insertAt]);
        } else {
          targetContainer.appendChild(newFieldElement);
        }
      } else {
        targetContainer.appendChild(newFieldElement);
      }
    } else {
      // Default: append to end
      targetContainer.appendChild(newFieldElement);
    }
  }

  private createFieldElement(fieldName: string, config: FormFieldConfig): HTMLElement {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = this.options.cssClasses?.fieldGroup || 'annie-field-group';
    fieldGroup.setAttribute('data-field', fieldName);

    // Create label
    if (config.label) {
      const label = document.createElement('label');
      label.className = this.options.cssClasses?.label || 'annie-label';
      label.setAttribute('for', fieldName);
      label.textContent = config.label;
      if (config.required) {
        const required = document.createElement('span');
        required.className = 'required-indicator';
        required.textContent = ' *';
        label.appendChild(required);
      }
      fieldGroup.appendChild(label);
    }

    // Create input element
    const inputElement = this.createInputElement(fieldName, config);
    fieldGroup.appendChild(inputElement);

    // Add help text
    if (config.helpText) {
      const helpText = document.createElement('div');
      helpText.className = 'annie-help-text';
      helpText.textContent = config.helpText;
      fieldGroup.appendChild(helpText);
    }

    // Create validation message container
    if (this.options.showValidationMessages) {
      const validationContainer = document.createElement('div');
      validationContainer.className = 'annie-validation-messages';
      validationContainer.setAttribute('data-validation-for', fieldName);
      fieldGroup.appendChild(validationContainer);
    }

    return fieldGroup;
  }

  private createInputElement(fieldName: string, config: FormFieldConfig): HTMLElement {
    let element: HTMLElement;
    const baseClass = this.options.cssClasses?.input || 'annie-input';
    const field = this.form.getField(fieldName);
    const currentValue = field?.value || '';

    switch (config.type) {
      case 'select':
        element = document.createElement('select');
        element.className = baseClass;
        if (config.options) {
          config.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            optionElement.disabled = option.disabled || false;
            if (option.value === currentValue) {
              optionElement.selected = true;
            }
            element.appendChild(optionElement);
          });
        }
        break;

      case 'textarea':
        element = document.createElement('textarea');
        element.className = baseClass;
        (element as HTMLTextAreaElement).value = currentValue;
        break;

      case 'checkbox':
        element = document.createElement('input');
        (element as HTMLInputElement).type = 'checkbox';
        element.className = baseClass;
        (element as HTMLInputElement).checked = !!currentValue;
        break;

      case 'radio':
        element = document.createElement('div');
        element.className = `${baseClass}-radio-group`;
        if (config.options) {
          config.options.forEach(option => {
            const radioWrapper = document.createElement('div');
            radioWrapper.className = 'annie-radio-wrapper';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = fieldName;
            radio.value = option.value;
            radio.id = `${fieldName}_${option.value}`;
            radio.checked = option.value === currentValue;
            radio.disabled = option.disabled || config.disabled || false;

            const label = document.createElement('label');
            label.setAttribute('for', radio.id);
            label.textContent = option.label;

            radioWrapper.appendChild(radio);
            radioWrapper.appendChild(label);
            element.appendChild(radioWrapper);
          });
        }
        break;

      default:
        element = document.createElement('input');
        (element as HTMLInputElement).type = config.type;
        element.className = baseClass;
        (element as HTMLInputElement).value = currentValue;
        break;
    }

    // Set common attributes
    element.id = fieldName;
    element.setAttribute('name', fieldName);
    
    if (config.placeholder) {
      element.setAttribute('placeholder', config.placeholder);
    }
    
    if (config.required) {
      element.setAttribute('required', 'true');
    }
    
    if (config.disabled) {
      element.setAttribute('disabled', 'true');
    }
    
    if (config.readonly) {
      element.setAttribute('readonly', 'true');
    }

    if (config.cssClass) {
      element.classList.add(config.cssClass);
    }

    // Add custom attributes
    if (config.attributes) {
      Object.entries(config.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value.toString());
      });
    }

    return element;
  }

  private bindEvents(): void {
    if (!this.container) return;

    const form = this.container.querySelector('form');
    if (!form) return;

    // Bind form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Bind field events
    Object.keys(this.form.getFields()).forEach(fieldName => {
      this.bindFieldEvents(fieldName);
    });
  }

  private bindFieldEvents(fieldName: string): void {
    if (!this.container) return;

    const fieldGroup = this.container.querySelector(`[data-field="${fieldName}"]`);
    if (!fieldGroup) return;

    const inputElements = fieldGroup.querySelectorAll('input, select, textarea');
    
    inputElements.forEach(element => {
      // Handle value changes
      element.addEventListener('input', (e) => {
        this.handleFieldChange(fieldName, e.target as HTMLInputElement);
        
        if (this.options.validateOnInput) {
          this.validateField(fieldName);
        }
      });

      element.addEventListener('change', (e) => {
        this.handleFieldChange(fieldName, e.target as HTMLInputElement);
      });

      // Handle validation on blur
      if (this.options.validateOnBlur) {
        element.addEventListener('blur', () => {
          this.validateField(fieldName);
        });
      }

      // Auto focus first field
      if (this.options.autoFocus) {
        const firstInput = this.container?.querySelector('input, select, textarea') as HTMLElement;
        if (element === firstInput) {
          (element as HTMLElement).focus();
        }
      }
    });
  }

  private handleFieldChange(fieldName: string, element: HTMLInputElement): void {
    let value: any;

    switch (element.type) {
      case 'checkbox':
        value = element.checked;
        break;
      case 'radio':
        if (element.checked) {
          value = element.value;
        } else {
          return; // Don't update if radio is unchecked
        }
        break;
      case 'file':
        value = element.files;
        break;
      case 'number':
        value = element.value === '' ? null : parseFloat(element.value);
        break;
      default:
        value = element.value;
        break;
    }

    this.form.setValue(fieldName, value);
  }

  private validateField(fieldName: string): void {
    const validation = this.form.validateFieldForRenderer(fieldName);
    this.updateValidationDisplay(fieldName, validation);
  }

  private updateValidationDisplay(fieldName: string, validation: import('../utils/type-guards.js').ValidationResult): void {
    if (!this.options.showValidationMessages || !this.container) return;

    const validationContainer = this.container.querySelector(`[data-validation-for="${fieldName}"]`);
    if (!validationContainer) return;

    // Clear existing messages
    validationContainer.innerHTML = '';

    // Add error messages
    if (validation.errors && validation.errors.length > 0) {
      validation.errors.forEach(error => {
        const errorElement = document.createElement('div');
        errorElement.className = this.options.cssClasses?.error || 'annie-error';
        errorElement.textContent = error;
        validationContainer.appendChild(errorElement);
      });
    }

    // Add warning messages
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        const warningElement = document.createElement('div');
        warningElement.className = this.options.cssClasses?.warning || 'annie-warning';
        warningElement.textContent = warning;
        validationContainer.appendChild(warningElement);
      });
    }

    // Update field styling
    const fieldGroup = this.container.querySelector(`[data-field="${fieldName}"]`);
    if (fieldGroup) {
      fieldGroup.classList.remove('has-error', 'has-warning', 'has-success');
      
      if (!validation.isValid && validation.errors && validation.errors.length > 0) {
        fieldGroup.classList.add('has-error');
      } else if (validation.warnings && validation.warnings.length > 0) {
        fieldGroup.classList.add('has-warning');
      } else if (validation.isValid) {
        fieldGroup.classList.add('has-success');
      }
    }
  }

  private subscribeToFormState(): void {
    // Subscribe to form validation state changes
    this.form.getValidationState().subscribe({
      next: (validationState) => {
        Object.entries(validationState).forEach(([fieldName, validation]) => {
          this.updateValidationDisplay(fieldName, validation);
        });
      },
      error: (error) => {
        console.error('Form validation state error:', error);
      },
      complete: () => {
        console.log('Form validation state complete');
      }
    });

    // Subscribe to form submission state
    this.form.getSubmissionState().subscribe({
      next: (state) => {
        if (this.container) {
          const form = this.container.querySelector('form');
          if (form) {
            if (state.isSubmitting) {
              form.classList.add('submitting');
            } else {
              form.classList.remove('submitting');
            }
            
            if (state.hasError && state.error) {
              this.showFormError(state.error);
            }
          }
        }
      },
      error: (error) => {
        console.error('Form submission state error:', error);
      },
      complete: () => {
        console.log('Form submission state complete');
      }
    });
  }

  private handleSubmit(): void {
    // Validate all fields before submission
    const validation = this.form.validate();
    
    if (validation.isValid) {
      // Submit the form
      const formData = this.form.getValues();
      const formName = this.form.getName();
      
      // Emit custom DOM event for form submission
      const event = new CustomEvent('annie:form:submit', {
        detail: { formName, data: formData, form: this.form },
        bubbles: true
      });
      document.dispatchEvent(event);
    } else {
      // Show validation errors
      Object.keys(validation.fieldErrors || {}).forEach(fieldName => {
        const fieldValidation = validation.fieldErrors?.[fieldName];
        if (fieldValidation) {
          this.updateValidationDisplay(fieldName, fieldValidation);
        }
      });
    }
  }

  private showFormError(error: string): void {
    if (!this.container) return;

    // Remove existing error message
    const existingError = this.container.querySelector('.annie-form-error');
    if (existingError) {
      existingError.remove();
    }

    // Create new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'annie-form-error';
    errorElement.textContent = error;

    // Insert at the beginning of the form
    const form = this.container.querySelector('form');
    if (form && form.firstChild) {
      form.insertBefore(errorElement, form.firstChild);
    }
  }

  private setupGridLayout(form: HTMLFormElement): void {
    const columns = this.options.layout?.columns || 12;
    const gap = this.options.layout?.gap || '15px';
    
    // Add CSS custom properties for grid
    form.style.setProperty('--annie-grid-columns', columns.toString());
    form.style.setProperty('--annie-grid-gap', gap);
    
    // Add grid classes
    form.classList.add('annie-grid-form');
    
    // Inject CSS if not already present
    this.injectGridCSS();
  }

  private injectGridCSS(): void {
    const styleId = 'annie-grid-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .annie-grid-form {
        display: grid;
        grid-template-columns: repeat(var(--annie-grid-columns, 12), 1fr);
        gap: var(--annie-grid-gap, 15px);
      }
      
      .annie-grid-row {
        display: contents;
      }
      
      .annie-col {
        grid-column: span 1;
      }
      
      /* Column spans */
      .annie-col-1 { grid-column: span 1; }
      .annie-col-2 { grid-column: span 2; }
      .annie-col-3 { grid-column: span 3; }
      .annie-col-4 { grid-column: span 4; }
      .annie-col-5 { grid-column: span 5; }
      .annie-col-6 { grid-column: span 6; }
      .annie-col-7 { grid-column: span 7; }
      .annie-col-8 { grid-column: span 8; }
      .annie-col-9 { grid-column: span 9; }
      .annie-col-10 { grid-column: span 10; }
      .annie-col-11 { grid-column: span 11; }
      .annie-col-12 { grid-column: span 12; }
      
      /* Column offsets */
      .annie-offset-1 { grid-column-start: 2; }
      .annie-offset-2 { grid-column-start: 3; }
      .annie-offset-3 { grid-column-start: 4; }
      .annie-offset-4 { grid-column-start: 5; }
      .annie-offset-5 { grid-column-start: 6; }
      .annie-offset-6 { grid-column-start: 7; }
      .annie-offset-7 { grid-column-start: 8; }
      .annie-offset-8 { grid-column-start: 9; }
      .annie-offset-9 { grid-column-start: 10; }
      .annie-offset-10 { grid-column-start: 11; }
      .annie-offset-11 { grid-column-start: 12; }
      
      /* Responsive breakpoints (mobile-first) */
      @media (max-width: 575px) {
        .annie-xs-1 { grid-column: span 1; }
        .annie-xs-2 { grid-column: span 2; }
        .annie-xs-3 { grid-column: span 3; }
        .annie-xs-4 { grid-column: span 4; }
        .annie-xs-5 { grid-column: span 5; }
        .annie-xs-6 { grid-column: span 6; }
        .annie-xs-7 { grid-column: span 7; }
        .annie-xs-8 { grid-column: span 8; }
        .annie-xs-9 { grid-column: span 9; }
        .annie-xs-10 { grid-column: span 10; }
        .annie-xs-11 { grid-column: span 11; }
        .annie-xs-12 { grid-column: span 12; }
      }
      
      @media (min-width: 576px) {
        .annie-sm-1 { grid-column: span 1; }
        .annie-sm-2 { grid-column: span 2; }
        .annie-sm-3 { grid-column: span 3; }
        .annie-sm-4 { grid-column: span 4; }
        .annie-sm-5 { grid-column: span 5; }
        .annie-sm-6 { grid-column: span 6; }
        .annie-sm-7 { grid-column: span 7; }
        .annie-sm-8 { grid-column: span 8; }
        .annie-sm-9 { grid-column: span 9; }
        .annie-sm-10 { grid-column: span 10; }
        .annie-sm-11 { grid-column: span 11; }
        .annie-sm-12 { grid-column: span 12; }
      }
      
      @media (min-width: 768px) {
        .annie-md-1 { grid-column: span 1; }
        .annie-md-2 { grid-column: span 2; }
        .annie-md-3 { grid-column: span 3; }
        .annie-md-4 { grid-column: span 4; }
        .annie-md-5 { grid-column: span 5; }
        .annie-md-6 { grid-column: span 6; }
        .annie-md-7 { grid-column: span 7; }
        .annie-md-8 { grid-column: span 8; }
        .annie-md-9 { grid-column: span 9; }
        .annie-md-10 { grid-column: span 10; }
        .annie-md-11 { grid-column: span 11; }
        .annie-md-12 { grid-column: span 12; }
      }
      
      @media (min-width: 992px) {
        .annie-lg-1 { grid-column: span 1; }
        .annie-lg-2 { grid-column: span 2; }
        .annie-lg-3 { grid-column: span 3; }
        .annie-lg-4 { grid-column: span 4; }
        .annie-lg-5 { grid-column: span 5; }
        .annie-lg-6 { grid-column: span 6; }
        .annie-lg-7 { grid-column: span 7; }
        .annie-lg-8 { grid-column: span 8; }
        .annie-lg-9 { grid-column: span 9; }
        .annie-lg-10 { grid-column: span 10; }
        .annie-lg-11 { grid-column: span 11; }
        .annie-lg-12 { grid-column: span 12; }
      }
      
      @media (min-width: 1200px) {
        .annie-xl-1 { grid-column: span 1; }
        .annie-xl-2 { grid-column: span 2; }
        .annie-xl-3 { grid-column: span 3; }
        .annie-xl-4 { grid-column: span 4; }
        .annie-xl-5 { grid-column: span 5; }
        .annie-xl-6 { grid-column: span 6; }
        .annie-xl-7 { grid-column: span 7; }
        .annie-xl-8 { grid-column: span 8; }
        .annie-xl-9 { grid-column: span 9; }
        .annie-xl-10 { grid-column: span 10; }
        .annie-xl-11 { grid-column: span 11; }
        .annie-xl-12 { grid-column: span 12; }
      }
      
      /* New row forcing */
      .annie-new-row {
        grid-column: 1 / -1;
      }
      
      /* Table cell field styles */
      .annie-table-cell-field {
        width: 100%;
        border: 1px solid #ddd;
        padding: 4px 8px;
        font-size: 14px;
        border-radius: 3px;
        background: white;
      }
      
      .annie-table-cell-field:focus {
        outline: none;
        border-color: #007acc;
        box-shadow: 0 0 0 2px rgba(0,122,204,0.1);
      }
      
      .annie-table-cell-field:disabled {
        background: #f5f5f5;
        color: #666;
        cursor: not-allowed;
      }
      
      .annie-table-actions {
        white-space: nowrap;
        padding: 4px;
      }
      
      .annie-table-actions button {
        margin: 0 2px;
        padding: 4px 8px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .annie-btn-primary {
        background: #007acc !important;
        color: white !important;
        border-color: #007acc !important;
      }
      
      .annie-btn-secondary {
        background: #6c757d !important;
        color: white !important;
        border-color: #6c757d !important;
      }
      
      .annie-btn-sm {
        padding: 2px 6px !important;
        font-size: 11px !important;
      }
    `;
    document.head.appendChild(style);
  }

  private renderFieldsWithGrid(form: HTMLFormElement): void {
    const fields = this.form.getFields();
    const fieldConfigs: Array<{ name: string; config: FormFieldConfig }> = [];
    
    // Collect all field configurations
    Object.keys(fields).forEach(fieldName => {
      const field = this.form.getField(fieldName);
      if (field) {
        const fieldConfig: FormFieldConfig = {
          name: fieldName,
          type: field.type,
          label: field.label,
          required: field.required,
          disabled: field.disabled,
          readonly: field.readonly
        };
        fieldConfigs.push({ name: fieldName, config: fieldConfig });
      }
    });
    
    // Sort by layout order if specified
    fieldConfigs.sort((a, b) => {
      const orderA = a.config.layout?.order || 0;
      const orderB = b.config.layout?.order || 0;
      return orderA - orderB;
    });
    
    // Render fields with grid positioning
    fieldConfigs.forEach(({ name, config }) => {
      const fieldElement = this.createFieldElement(name, config);
      this.applyGridLayout(fieldElement, config.layout);
      form.appendChild(fieldElement);
    });
  }

  private applyGridLayout(element: HTMLElement, layout?: FormFieldConfig['layout']): void {
    if (!layout) return;
    
    const classes: string[] = [];
    
    // Basic column span
    if (layout.fullWidth) {
      classes.push('annie-col-12');
    } else if (layout.column) {
      classes.push(`annie-col-${layout.column}`);
    }
    
    // Offset
    if (layout.offset) {
      classes.push(`annie-offset-${layout.offset}`);
    }
    
    // Responsive classes
    Object.entries(layout).forEach(([breakpoint, settings]) => {
      if (typeof settings === 'object' && settings !== null) {
        const bp = breakpoint as keyof FormFieldConfig['layout'];
        if (['xs', 'sm', 'md', 'lg', 'xl'].includes(bp)) {
          if (settings.column) {
            classes.push(`annie-${bp}-${settings.column}`);
          }
          if (settings.offset) {
            classes.push(`annie-${bp}-offset-${settings.offset}`);
          }
        }
      }
    });
    
    // New row
    if (layout.newRow) {
      classes.push('annie-new-row');
    }
    
    // Grid area
    if (layout.gridArea) {
      element.style.gridArea = layout.gridArea;
    }
    
    // CSS order
    if (layout.order !== undefined) {
      element.style.order = layout.order.toString();
    }
    
    // Apply all classes
    if (classes.length > 0) {
      element.classList.add(...classes);
    }
  }

  /**
   * Resolve table cell target for field placement
   */
  private resolveTableCellTarget(config: FormFieldConfig): HTMLElement | null {
    const layout = config.layout;
    if (!layout) return null;

    let targetRow: HTMLTableRowElement | null = null;
    let targetCell: HTMLTableCellElement | null = null;

    // 1. Find or create the target table row
    if (layout.tableRowId) {
      targetRow = document.getElementById(layout.tableRowId) as HTMLTableRowElement;
    } else if (layout.tableRowSelector) {
      targetRow = document.querySelector(layout.tableRowSelector) as HTMLTableRowElement;
    } else if (layout.createTableRow && layout.tableContainer) {
      targetRow = this.createTableRow(layout.tableContainer, layout.tableRowData);
    }

    if (!targetRow) return null;

    // 2. Find or create the target cell within the row
    if (layout.tableCellSelector) {
      targetCell = targetRow.querySelector(layout.tableCellSelector) as HTMLTableCellElement;
    } else if (typeof layout.tableCellIndex === 'number') {
      targetCell = targetRow.cells[layout.tableCellIndex] as HTMLTableCellElement;
    } else {
      // Default to first available empty cell or create new one
      targetCell = this.findOrCreateTableCell(targetRow, layout.tableCellIndex || 0);
    }

    return targetCell;
  }

  /**
   * Create a table row in the specified container
   */
  private createTableRow(containerSelector: string, rowData?: any): HTMLTableRowElement | null {
    const container = document.querySelector(containerSelector);
    if (!container) return null;

    const row = document.createElement('tr');
    
    // Add data attributes if provided
    if (rowData) {
      if (rowData.id) {
        row.id = rowData.id;
      }
      Object.entries(rowData).forEach(([key, value]) => {
        if (key !== 'id') {
          row.setAttribute(`data-${key}`, String(value));
        }
      });
    }

    container.appendChild(row);
    return row;
  }

  /**
   * Find existing cell or create new one at specified index
   */
  private findOrCreateTableCell(row: HTMLTableRowElement, cellIndex: number): HTMLTableCellElement {
    // Try to find existing cell
    let cell = row.cells[cellIndex];
    
    if (!cell) {
      // Create cells up to the required index
      while (row.cells.length <= cellIndex) {
        cell = document.createElement('td');
        row.appendChild(cell);
      }
    }

    return cell as HTMLTableCellElement;
  }

  /**
   * Create a simplified field element optimized for table cells
   */
  private createTableCellField(config: FormFieldConfig): HTMLElement {
    const field = this.form.getField(config.name);
    if (!field) {
      throw new Error(`Field ${config.name} not found in form`);
    }

    // Create just the input element for table cells (no label wrapper)
    const input = this.createInputElement(config.name, config);

    // Mark as table cell field for styling
    input.classList.add('annie-table-cell-field');
    input.setAttribute('data-field', config.name);

    return input;
  }

  /**
   * Add field to specific table row and cell
   */
  addFieldToTableCell(config: FormFieldConfig, options: {
    rowId?: string;
    rowSelector?: string; 
    cellIndex?: number;
    cellSelector?: string;
    createRow?: boolean;
    tableContainer?: string;
    rowData?: any;
  }): void {
    // Merge table targeting options into layout config
    const enhancedConfig: FormFieldConfig = {
      ...config,
      layout: {
        ...config.layout,
        tableRowId: options.rowId,
        tableRowSelector: options.rowSelector,
        tableCellIndex: options.cellIndex,
        tableCellSelector: options.cellSelector,
        createTableRow: options.createRow,
        tableContainer: options.tableContainer,
        tableRowData: options.rowData
      }
    };

    this.addField(enhancedConfig);
  }

  /**
   * Add multiple fields to a table row (common pattern for data entry rows)
   */
  addFieldsToTableRow(fields: FormFieldConfig[], options: {
    rowId?: string;
    rowSelector?: string;
    createRow?: boolean;
    tableContainer?: string;
    rowData?: any;
    startCellIndex?: number;
  }): void {
    const startIndex = options.startCellIndex || 0;

    fields.forEach((fieldConfig, index) => {
      this.addFieldToTableCell(fieldConfig, {
        ...options,
        cellIndex: startIndex + index
      });
    });
  }

  /**
   * Create a complete editable table row with form fields
   */
  createEditableTableRow(fields: FormFieldConfig[], options: {
    tableContainer: string;
    rowData?: any;
    onSave?: (rowData: any) => void;
    onCancel?: () => void;
    includeActions?: boolean;
  }): HTMLTableRowElement | null {
    // Create the row
    const row = this.createTableRow(options.tableContainer, options.rowData);
    if (!row) return null;

    // Add data fields
    fields.forEach((fieldConfig, index) => {
      this.addFieldToTableCell(fieldConfig, {
        rowSelector: `#${row.id}`,
        cellIndex: index,
        createRow: false
      });
    });

    // Add action buttons if requested
    if (options.includeActions) {
      const actionsCell = this.findOrCreateTableCell(row, fields.length);
      actionsCell.classList.add('annie-table-actions');
      
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.type = 'button';
      saveBtn.classList.add('annie-btn', 'annie-btn-primary', 'annie-btn-sm');
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.type = 'button';
      cancelBtn.classList.add('annie-btn', 'annie-btn-secondary', 'annie-btn-sm');

      // Event handlers
      if (options.onSave) {
        saveBtn.addEventListener('click', () => {
          const rowData = this.collectRowData(row, fields);
          options.onSave?.(rowData);
        });
      }

      if (options.onCancel) {
        cancelBtn.addEventListener('click', options.onCancel);
      }

      actionsCell.appendChild(saveBtn);
      actionsCell.appendChild(cancelBtn);
    }

    return row;
  }

  /**
   * Collect form data from all fields in a table row
   */
  private collectRowData(row: HTMLTableRowElement, fields: FormFieldConfig[]): any {
    const data: any = {};
    
    fields.forEach((fieldConfig) => {
      const field = this.form.getField(fieldConfig.name);
      if (field) {
        data[fieldConfig.name] = field.value;
      }
    });

    // Include any data attributes from the row
    for (let i = 0; i < row.attributes.length; i++) {
      const attr = row.attributes[i];
      if (attr.name.startsWith('data-')) {
        const key = attr.name.substring(5); // Remove 'data-' prefix
        data[key] = attr.value;
      }
    }

    return data;
  }
}

/**
 * Form Builder for creating forms declaratively
 * Note: This requires proper dependency injection setup to work with ReactiveForm
 */
export class FormBuilder {
  static create(
    name: string, 
    fields: FormFieldConfig[], 
    options?: FormRenderOptions,
    stateManager?: import('../core/state-manager.js').StateManager,
    dataStore?: import('../core/data-store.js').DataStore,
    logger?: import('../core/logger.js').ILogger
  ): FormRenderer | null {
    // For now, return null if dependencies aren't provided
    // This will be properly integrated with Annie's DI container
    if (!stateManager || !dataStore || !logger) {
      console.warn('FormBuilder.create requires StateManager, DataStore, and Logger dependencies');
      return null;
    }

    const formConfig: import('./reactive-form.js').FormConfig = {
      id: name,
      fields: fields.map(fieldConfig => ({
        name: fieldConfig.name,
        type: fieldConfig.type,
        label: fieldConfig.label,
        placeholder: fieldConfig.placeholder,
        required: fieldConfig.required || false,
        disabled: fieldConfig.disabled || false,
        readonly: fieldConfig.readonly || false,
        value: null,
        validation: fieldConfig.validators ? fieldConfig.validators.map(validator => ({
          type: 'custom' as const,
          validator: validator
        })) : undefined,
        options: fieldConfig.options,
        attributes: fieldConfig.attributes ? Object.fromEntries(
          Object.entries(fieldConfig.attributes).map(([k, v]) => [k, v.toString()])
        ) : undefined,
        helpText: fieldConfig.helpText
      }))
    };

    const form = new ReactiveForm(formConfig, stateManager, dataStore, logger);
    return new FormRenderer(form, options);
  }

  static fromConfig(config: {
    name: string;
    fields: FormFieldConfig[];
    options?: FormRenderOptions;
    containerSelector?: string;
    stateManager?: import('../core/state-manager.js').StateManager;
    dataStore?: import('../core/data-store.js').DataStore;
    logger?: import('../core/logger.js').ILogger;
  }): FormRenderer | null {
    const renderer = FormBuilder.create(
      config.name, 
      config.fields, 
      config.options,
      config.stateManager,
      config.dataStore,
      config.logger
    );
    
    if (renderer && config.containerSelector) {
      renderer.render(config.containerSelector);
    }
    
    return renderer;
  }
}
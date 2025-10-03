/**
 * Enhanced Forms API for Annie Framework
 * Provides reactive forms, validation, and advanced form handling
 */

import { Observable } from '../core/observable.js';
import { StateManager } from '../core/state-manager.js';
import { DataStore } from '../core/data-store.js';
import { ILogger } from '../core/logger.js';
import { IDisposable } from '../core/di-container.js';
import { ValidationResult } from '../utils/type-guards.js';

export interface SubmissionState {
  isSubmitting: boolean;
  hasError: boolean;
  error: string | null;
}

export interface FormField {
  name: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  value?: any;
  validation?: FormValidationRule[];
  options?: SelectOption[];
  attributes?: Record<string, string>;
  errorMessage?: string;
  helpText?: string;
}

export type FormFieldType = 
  | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' 
  | 'date' | 'datetime-local' | 'time' | 'month' | 'week'
  | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file' | 'hidden'
  | 'range' | 'color' | 'search';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  group?: string;
}

export interface FormValidationRule {
  type: 'required' | 'email' | 'url' | 'pattern' | 'minLength' | 'maxLength' | 'min' | 'max' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any, field: FormField, form: ReactiveForm) => ValidationResult;
}

export interface FormConfig {
  id: string;
  fields: FormField[];
  validation?: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    validateOnSubmit?: boolean;
    showErrorsImmediately?: boolean;
  };
  submission?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    action?: string;
    preventDefault?: boolean;
    onSubmit?: (formData: FormData, form: ReactiveForm) => void | Promise<void>;
    onSuccess?: (response: any, form: ReactiveForm) => void;
    onError?: (error: any, form: ReactiveForm) => void;
  };
  layout?: {
    template?: string;
    cssClasses?: {
      form?: string;
      field?: string;
      label?: string;
      input?: string;
      error?: string;
      help?: string;
    };
  };
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  valid: boolean;
  submitting: boolean;
  submitted: boolean;
}

export class ReactiveForm implements IDisposable {
  private config: FormConfig;
  private state: FormState;
  private stateManager: StateManager;
  private dataStore: DataStore;
  private logger: ILogger;
  private element?: HTMLFormElement;
  private subscriptions: Array<{ unsubscribe: () => void }> = [];
  private fieldElements: Map<string, HTMLElement> = new Map();
  private disposed: boolean = false;

  constructor(
    config: FormConfig,
    stateManager: StateManager,
    dataStore: DataStore,
    logger: ILogger
  ) {
    this.config = config;
    this.stateManager = stateManager;
    this.dataStore = dataStore;
    this.logger = logger;

    // Initialize form state
    this.state = {
      values: this.extractInitialValues(),
      errors: {},
      touched: {},
      dirty: {},
      valid: false,
      submitting: false,
      submitted: false
    };

    this.initialize();
  }

  /**
   * Get the form name/id
   */
  getName(): string {
    return this.config.id;
  }

  /**
   * Get all fields as a Map for compatibility with form renderer
   */
  getFields(): Map<string, FormField> {
    const fieldsMap = new Map<string, FormField>();
    this.config.fields.forEach(field => {
      fieldsMap.set(field.name, field);
    });
    return fieldsMap;
  }

  /**
   * Get a specific field
   */
  getField(name: string): FormField | undefined {
    return this.config.fields.find(field => field.name === name);
  }

  /**
   * Add a new field to the form
   */
  addField(name: string, field: Omit<FormField, 'name'>): void {
    const newField: FormField = {
      name,
      ...field
    };
    this.config.fields.push(newField);
    
    // Update form state with new field
    this.state.values[name] = field.value ?? this.getDefaultValue(field.type);
    this.updateStateManager();
  }

  /**
   * Remove a field from the form
   */
  removeField(name: string): void {
    const index = this.config.fields.findIndex(field => field.name === name);
    if (index >= 0) {
      this.config.fields.splice(index, 1);
      
      // Update form state
      delete this.state.values[name];
      delete this.state.errors[name];
      delete this.state.touched[name];
      delete this.state.dirty[name];
      this.updateStateManager();
    }
  }

  /**
   * Get validation state as Observable for renderer compatibility
   */
  getValidationState(): Observable<Record<string, ValidationResult>> {
    return new Observable<Record<string, ValidationResult>>((observer) => {
      // Emit current validation state
      const validationResults: Record<string, ValidationResult> = {};
      
      Object.keys(this.state.errors).forEach(fieldName => {
        validationResults[fieldName] = {
          isValid: !this.state.errors[fieldName] || this.state.errors[fieldName].length === 0,
          errors: this.state.errors[fieldName] || [],
          warnings: []
        };
      });
      
      observer.next(validationResults);
      
      // Return cleanup function
      return () => {
        // Cleanup if needed
      };
    });
  }

  /**
   * Get submission state as Observable for renderer compatibility
   */
  getSubmissionState(): Observable<SubmissionState> {
    return new Observable<SubmissionState>((observer) => {
      observer.next({
        isSubmitting: this.state.submitting,
        hasError: false,
        error: null
      });
      
      // Return cleanup function
      return () => {
        // Cleanup if needed
      };
    });
  }

  /**
   * Validate a specific field and return ValidationResult for renderer compatibility
   */
  validateFieldForRenderer(fieldName: string): ValidationResult {
    const isValid = this.validateField(fieldName); // Use existing boolean method
    const errors = this.state.errors[fieldName] || [];
    
    return {
      isValid,
      errors,
      warnings: []
    };
  }

  /**
   * Validate the entire form for renderer compatibility
   */
  validate(): { isValid: boolean; fieldErrors?: Record<string, ValidationResult> } {
    const fieldErrors: Record<string, ValidationResult> = {};
    let isValid = true;

    this.config.fields.forEach(field => {
      const validation = this.validateFieldForRenderer(field.name);
      fieldErrors[field.name] = validation;
      if (!validation.isValid) {
        isValid = false;
      }
    });

    // Update overall form validity
    this.validateForm();

    return { isValid, fieldErrors };
  }

  private initialize(): void {
    // Store initial form state in state manager
    this.stateManager.setState(`form.${this.config.id}`, this.state, 'form-init');
    
    // Find or create form element
    this.findOrCreateFormElement();
    
    // Set up field listeners
    this.setupFieldListeners();
    
    // Initial validation
    this.validateForm();
    
    this.logger.info(`Reactive form '${this.config.id}' initialized with ${this.config.fields.length} fields`);
  }

  private extractInitialValues(): Record<string, any> {
    const values: Record<string, any> = {};
    this.config.fields.forEach(field => {
      values[field.name] = field.value ?? this.getDefaultValue(field.type);
    });
    return values;
  }

  private getDefaultValue(type: FormFieldType): any {
    switch (type) {
      case 'checkbox': return false;
      case 'number': case 'range': return 0;
      case 'file': return null;
      default: return '';
    }
  }

  private findOrCreateFormElement(): void {
    // Try to find existing form element
    this.element = document.getElementById(this.config.id) as HTMLFormElement;
    
    if (!this.element) {
      // Create form element if it doesn't exist
      this.element = document.createElement('form');
      this.element.id = this.config.id;
      this.element.setAttribute('data-annie-form', 'true');
      
      // Apply CSS classes
      if (this.config.layout?.cssClasses?.form) {
        this.element.className = this.config.layout.cssClasses.form;
      }
      
      this.logger.debug(`Created form element: ${this.config.id}`);
    }

    // Set up form submission handler
    this.setupFormSubmission();
  }

  private setupFormSubmission(): void {
    if (!this.element) return;

    const submitObservable = Observable.fromEvent(this.element, 'submit');
    const subscription = submitObservable.subscribe({
      next: (event: Event) => {
        if (this.config.submission?.preventDefault !== false) {
          event.preventDefault();
        }
        this.handleSubmit();
      },
      error: (error: Error) => {
        this.logger.error(`Form submission error: ${error}`);
      },
      complete: () => {
        // Form submission complete
      }
    });

    this.subscriptions.push(subscription);
  }

  private setupFieldListeners(): void {
    this.config.fields.forEach(field => {
      this.setupFieldListener(field);
    });
  }

  private setupFieldListener(field: FormField): void {
    const element = this.findFieldElement(field.name);
    if (!element) {
      this.logger.warn(`Field element not found: ${field.name}`);
      return;
    }

    this.fieldElements.set(field.name, element);

    // Set up change listener
    const changeObservable = Observable.fromEvent(element, 'change');
    const changeSubscription = changeObservable.subscribe({
      next: () => {
        this.handleFieldChange(field.name, element);
      },
      error: (e: Error) => this.logger.error(`Field change error: ${e}`),
      complete: () => {}
    });

    // Set up blur listener for validation
    const blurObservable = Observable.fromEvent(element, 'blur');
    const blurSubscription = blurObservable.subscribe({
      next: () => {
        this.handleFieldBlur(field.name);
      },
      error: (e: Error) => this.logger.error(`Field blur error: ${e}`),
      complete: () => {}
    });

    // Set up input listener for real-time updates
    const inputObservable = Observable.fromEvent(element, 'input');
    const inputSubscription = inputObservable.subscribe({
      next: () => {
        this.handleFieldInput(field.name, element);
      },
      error: (e: Error) => this.logger.error(`Field input error: ${e}`),
      complete: () => {}
    });

    this.subscriptions.push(changeSubscription, blurSubscription, inputSubscription);
  }

  private findFieldElement(fieldName: string): HTMLElement | null {
    // Try multiple strategies to find the field element
    return document.querySelector(`#${this.config.id} [name="${fieldName}"]`) ||
           document.querySelector(`[name="${fieldName}"]`) ||
           document.getElementById(fieldName);
  }

  private handleFieldChange(fieldName: string, element: HTMLElement): void {
    const value = this.extractFieldValue(element);
    this.updateFieldValue(fieldName, value);
    this.markFieldAsDirty(fieldName);
    
    if (this.config.validation?.validateOnChange) {
      this.validateField(fieldName);
    }
  }

  private handleFieldBlur(fieldName: string): void {
    this.markFieldAsTouched(fieldName);
    
    if (this.config.validation?.validateOnBlur) {
      this.validateField(fieldName);
    }
  }

  private handleFieldInput(fieldName: string, element: HTMLElement): void {
    const value = this.extractFieldValue(element);
    this.updateFieldValue(fieldName, value, false); // Don't trigger full validation on input
  }

  private extractFieldValue(element: HTMLElement): any {
    const inputElement = element as HTMLInputElement;
    
    switch (inputElement.type) {
      case 'checkbox':
        return inputElement.checked;
      case 'radio':
        return inputElement.checked ? inputElement.value : undefined;
      case 'file':
        return inputElement.files;
      case 'number':
      case 'range':
        return inputElement.valueAsNumber;
      case 'date':
      case 'datetime-local':
        return inputElement.valueAsDate;
      default:
        return inputElement.value;
    }
  }

  private updateFieldValue(fieldName: string, value: any, validate: boolean = true): void {
    this.state.values[fieldName] = value;
    this.updateStateManager();
    
    // Update data store
    this.dataStore.updateField('forms', 0, `${this.config.id}.${fieldName}`, value);
    
    if (validate) {
      this.validateForm();
    }
  }

  private markFieldAsTouched(fieldName: string): void {
    this.state.touched[fieldName] = true;
    this.updateStateManager();
  }

  private markFieldAsDirty(fieldName: string): void {
    this.state.dirty[fieldName] = true;
    this.updateStateManager();
  }

  private updateStateManager(): void {
    this.stateManager.setState(`form.${this.config.id}`, this.state, 'form-update');
  }

  // Public API methods
  public getValue(fieldName: string): any {
    return this.state.values[fieldName];
  }

  public setValue(fieldName: string, value: any): void {
    this.updateFieldValue(fieldName, value);
    
    // Update the DOM element
    const element = this.fieldElements.get(fieldName) as HTMLInputElement;
    if (element) {
      if (element.type === 'checkbox') {
        element.checked = !!value;
      } else {
        element.value = value;
      }
    }
  }

  public getValues(): Record<string, any> {
    return { ...this.state.values };
  }

  public setValues(values: Record<string, any>): void {
    Object.entries(values).forEach(([fieldName, value]) => {
      this.setValue(fieldName, value);
    });
  }

  public getErrors(fieldName?: string): string[] | Record<string, string[]> {
    if (fieldName) {
      return this.state.errors[fieldName] || [];
    }
    return { ...this.state.errors };
  }

  public setError(fieldName: string, error: string): void {
    if (!this.state.errors[fieldName]) {
      this.state.errors[fieldName] = [];
    }
    this.state.errors[fieldName].push(error);
    this.updateStateManager();
  }

  public clearErrors(fieldName?: string): void {
    if (fieldName) {
      delete this.state.errors[fieldName];
    } else {
      this.state.errors = {};
    }
    this.updateStateManager();
  }

  public validateField(fieldName: string): boolean {
    const field = this.config.fields.find(f => f.name === fieldName);
    if (!field) return true;

    const value = this.state.values[fieldName];
    const errors: string[] = [];

    // Clear existing errors for this field
    delete this.state.errors[fieldName];

    // Run validation rules
    if (field.validation) {
      field.validation.forEach(rule => {
        const result = this.validateRule(value, rule, field);
        if (!result.isValid && result.errors) {
          errors.push(...result.errors);
        }
      });
    }

    // Store errors if any
    if (errors.length > 0) {
      this.state.errors[fieldName] = errors;
    }

    this.updateStateManager();
    return errors.length === 0;
  }

  public validateForm(): boolean {
    let allValid = true;
    
    this.config.fields.forEach(field => {
      const fieldValid = this.validateField(field.name);
      if (!fieldValid) {
        allValid = false;
      }
    });

    this.state.valid = allValid;
    this.updateStateManager();
    
    return allValid;
  }

  private validateRule(value: any, rule: FormValidationRule, field: FormField): ValidationResult {
    switch (rule.type) {
      case 'required':
        return {
          isValid: value != null && value !== '' && value !== false,
          errors: value == null || value === '' || value === false ? 
            [rule.message || `${field.label || field.name} is required`] : [],
          warnings: []
        };
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          isValid: !value || emailRegex.test(value),
          errors: value && !emailRegex.test(value) ? 
            [rule.message || `${field.label || field.name} must be a valid email`] : [],
          warnings: []
        };
        
      case 'minLength':
        return {
          isValid: !value || value.length >= (rule.value || 0),
          errors: value && value.length < (rule.value || 0) ? 
            [rule.message || `${field.label || field.name} must be at least ${rule.value} characters`] : [],
          warnings: []
        };
        
      case 'maxLength':
        return {
          isValid: !value || value.length <= (rule.value || Infinity),
          errors: value && value.length > (rule.value || Infinity) ? 
            [rule.message || `${field.label || field.name} must be no more than ${rule.value} characters`] : [],
          warnings: []
        };
        
      case 'pattern':
        const regex = new RegExp(rule.value);
        return {
          isValid: !value || regex.test(value),
          errors: value && !regex.test(value) ? 
            [rule.message || `${field.label || field.name} format is invalid`] : [],
          warnings: []
        };
        
      case 'custom':
        if (rule.validator) {
          return rule.validator(value, field, this);
        }
        return { isValid: true, errors: [], warnings: [] };
        
      default:
        return { isValid: true, errors: [], warnings: [] };
    }
  }

  public async submit(): Promise<void> {
    this.state.submitting = true;
    this.updateStateManager();

    try {
      // Validate before submission
      if (this.config.validation?.validateOnSubmit !== false) {
        const isValid = this.validateForm();
        if (!isValid) {
          throw new Error('Form validation failed');
        }
      }

      // Create FormData object
      const formData = new FormData();
      Object.entries(this.state.values).forEach(([key, value]) => {
        if (value instanceof FileList) {
          Array.from(value).forEach(file => formData.append(key, file));
        } else if (value != null) {
          formData.append(key, String(value));
        }
      });

      // Call submission handler
      if (this.config.submission?.onSubmit) {
        await this.config.submission.onSubmit(formData, this);
      }

      // Mark as submitted
      this.state.submitted = true;
      
      // Call success handler
      if (this.config.submission?.onSuccess) {
        this.config.submission.onSuccess(formData, this);
      }

    } catch (error) {
      this.logger.error(`Form submission failed: ${error}`);
      
      // Call error handler
      if (this.config.submission?.onError) {
        this.config.submission.onError(error, this);
      }
      
      throw error;
    } finally {
      this.state.submitting = false;
      this.updateStateManager();
    }
  }

  private async handleSubmit(): Promise<void> {
    try {
      await this.submit();
    } catch {
      // Error already handled in submit method
    }
  }

  public reset(): void {
    this.state.values = this.extractInitialValues();
    this.state.errors = {};
    this.state.touched = {};
    this.state.dirty = {};
    this.state.valid = false;
    this.state.submitted = false;
    
    // Reset DOM elements
    this.fieldElements.forEach((element, fieldName) => {
      const field = this.config.fields.find(f => f.name === fieldName);
      if (field && element) {
        const inputElement = element as HTMLInputElement;
        if (inputElement.type === 'checkbox') {
          inputElement.checked = !!field.value;
        } else {
          inputElement.value = field.value || '';
        }
      }
    });
    
    this.updateStateManager();
    this.logger.debug(`Form '${this.config.id}' reset`);
  }

  public getState(): FormState {
    return { ...this.state };
  }

  public isValid(): boolean {
    return this.state.valid;
  }

  public isDirty(fieldName?: string): boolean {
    if (fieldName) {
      return !!this.state.dirty[fieldName];
    }
    return Object.values(this.state.dirty).some(dirty => dirty);
  }

  public isTouched(fieldName?: string): boolean {
    if (fieldName) {
      return !!this.state.touched[fieldName];
    }
    return Object.values(this.state.touched).some(touched => touched);
  }

  dispose(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.fieldElements.clear();
    this.disposed = true;
    
    this.logger.debug(`Form '${this.config.id}' disposed`);
  }
}

export class FormBuilder {
  /**
   * Create a reactive form from configuration
   */
  static create(
    config: FormConfig,
    stateManager: StateManager,
    dataStore: DataStore,
    logger: ILogger
  ): ReactiveForm {
    return new ReactiveForm(config, stateManager, dataStore, logger);
  }

  /**
   * Create a form field configuration
   */
  static field(config: Partial<FormField> & { name: string; type: FormFieldType }): FormField {
    return {
      required: false,
      disabled: false,
      readonly: false,
      validation: [],
      ...config
    };
  }

  /**
   * Create validation rule
   */
  static validation(type: FormValidationRule['type'], value?: any, message?: string): FormValidationRule {
    return { type, value, message };
  }

  /**
   * Create form from HTML form element
   */
  static fromElement(
    formElement: HTMLFormElement,
    stateManager: StateManager,
    dataStore: DataStore,
    logger: ILogger
  ): ReactiveForm {
    const fields: FormField[] = [];
    
    // Extract fields from form element
    const inputs = formElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const element = input as HTMLInputElement;
      if (element.name) {
        fields.push(FormBuilder.field({
          name: element.name,
          type: element.type as FormFieldType || 'text',
          required: element.required,
          disabled: element.disabled,
          readonly: element.readOnly,
          value: element.value
        }));
      }
    });

    const config: FormConfig = {
      id: formElement.id || `form-${Date.now()}`,
      fields
    };

    return new ReactiveForm(config, stateManager, dataStore, logger);
  }
}
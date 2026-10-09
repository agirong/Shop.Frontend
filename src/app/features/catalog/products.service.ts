import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { Product } from '../../core/models/product.model';
import { environment } from '../../shared/environment';

/**
 * Servicio de acceso a datos de productos y categorías.
 * Consume la API REST del backend (Shop.Backend).
 */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }


  getByCategory(categoryId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products/category/${categoryId}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`);
  }
}
